import {
  useRef,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from 'react';
import { debounce } from 'lodash';
import { useRecoilState } from 'recoil';
import { useNavigate, useLocation } from 'react-router-dom';
import { setTokenHeader, SystemRoles } from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import {
  useGetRole,
  useGetUserQuery,
  useLoginUserMutation,
  useLogoutUserMutation,
  useRefreshTokenMutation,
} from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext, TResError } from '~/common';
import useTimeout from './useTimeout';
import store from '~/store';

const AuthContext = createContext<TAuthContext | undefined>(undefined);

const AuthContextProvider = ({
  authConfig,
  children,
}: {
  authConfig?: TAuthConfig;
  children: ReactNode;
}) => {
  const [user, setUser] = useRecoilState(store.user);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const logoutRedirectRef = useRef<string | undefined>(undefined);

  const { data: userRole = null } = useGetRole(SystemRoles.USER, {
    enabled: !!(isAuthenticated && (user?.role ?? '')),
  });
  const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
    enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const sendDebugLog = useCallback((hypothesisId: string, message: string, data: Record<string, unknown> = {}) => {
    const payload = {
      sessionId: '97f800',
      runId: 'pre-fix',
      hypothesisId,
      location: 'client/src/hooks/AuthContext.tsx',
      message,
      data,
      timestamp: Date.now(),
    };
    // #region agent log
    console.info('[agent-debug]', payload);
    // #endregion
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/62b56a56-4067-4871-bca4-ada532eb8bb4', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '97f800',
      },
      body: JSON.stringify(payload),
    }).catch((error) => {
      // #region agent log
      console.warn('[agent-debug] ingest failed', {
        location: 'client/src/hooks/AuthContext.tsx',
        message,
        hypothesisId,
        error: String((error as Error)?.message ?? error ?? 'unknown'),
      });
      // #endregion
    });
    // #endregion
  }, []);

  const setUserContext = useMemo(
    () =>
      debounce((userContext: TUserContext) => {
        const { token, isAuthenticated, user, redirect } = userContext;
        setUser(user);
        setToken(token);
        //@ts-ignore - ok for token to be undefined initially
        setTokenHeader(token);
        setIsAuthenticated(isAuthenticated);

        // Use a custom redirect if set
        const finalRedirect = logoutRedirectRef.current || redirect;
        // Clear the stored redirect
        logoutRedirectRef.current = undefined;

        if (finalRedirect == null) {
          return;
        }

        if (finalRedirect.startsWith('http://') || finalRedirect.startsWith('https://')) {
          window.location.href = finalRedirect;
        } else {
          navigate(finalRedirect, { replace: true });
        }
      }, 50),
    [navigate, setUser],
  );
  const doSetError = useTimeout({ callback: (error) => setError(error as string | undefined) });

  const loginUser = useLoginUserMutation({
    onSuccess: (data: t.TLoginResponse) => {
      const { user, token, twoFAPending, tempToken } = data;
      if (twoFAPending) {
        // Redirect to the two-factor authentication route.
        navigate(`/login/2fa?tempToken=${tempToken}`, { replace: true });
        return;
      }
      setError(undefined);
      setUserContext({ token, isAuthenticated: true, user, redirect: '/c/new' });
    },
    onError: (error: TResError | unknown) => {
      const resError = error as TResError;
      const message =
        resError?.response?.data?.message ??
        (resError?.response?.status ? `${resError.response.status}` : resError?.message ?? '');
      doSetError(message);
      navigate('/login', { replace: true });
    },
  });
  const logoutUser = useLogoutUserMutation({
    onSuccess: (data) => {
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: data.redirect ?? '/login',
      });
    },
    onError: (error) => {
      doSetError((error as Error).message);
      setUserContext({
        token: undefined,
        isAuthenticated: false,
        user: undefined,
        redirect: '/login',
      });
    },
  });
  const refreshToken = useRefreshTokenMutation();

  const logout = useCallback(
    (redirect?: string) => {
      if (redirect) {
        logoutRedirectRef.current = redirect;
      }
      logoutUser.mutate(undefined);
    },
    [logoutUser],
  );

  const userQuery = useGetUserQuery({ enabled: !!(token ?? '') });

  const login = (data: t.TLoginUser) => {
    loginUser.mutate(data);
  };

  const setAuthFromRegistration = useCallback(
    (data: { token: string; user: t.TUser }) => {
      setError(undefined);
      setUserContext({ token: data.token, isAuthenticated: true, user: data.user, redirect: '/c/new' });
    },
    [setUserContext],
  );

  const isPublicAuthPath = useCallback((pathname: string) => {
    const p = pathname.replace(/\/$/, '') || '/';
    return p === '/login' || p === '/register' || p === '/forgot-password' || p === '/reset-password' || p.startsWith('/login/');
  }, []);

  const silentRefresh = useCallback(() => {
    sendDebugLog('H3', 'silentRefresh start', {
      pathname: location.pathname,
      isAuthenticated,
      hasToken: !!token,
      testMode: authConfig?.test === true,
    });
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping silent refresh.');
      return;
    }
    refreshToken.mutate(undefined, {
      onSuccess: (data: t.TRefreshTokenResponse | undefined) => {
        const { user, token = '' } = data ?? {};
        sendDebugLog('H3', 'silentRefresh onSuccess', {
          pathname: location.pathname,
          hasTokenInResponse: !!token,
          hasUserInResponse: !!user,
          isPublicAuthPath: isPublicAuthPath(location.pathname),
        });
        if (token) {
          setUserContext({ token, isAuthenticated: true, user });
        } else {
          if (authConfig?.test === true) {
            return;
          }
          if (!isPublicAuthPath(location.pathname)) {
            navigate('/login');
          }
        }
      },
      onError: () => {
        sendDebugLog('H3', 'silentRefresh onError', {
          pathname: location.pathname,
          isPublicAuthPath: isPublicAuthPath(location.pathname),
          testMode: authConfig?.test === true,
        });
        if (authConfig?.test === true) {
          return;
        }
        if (!isPublicAuthPath(location.pathname)) {
          navigate('/login');
        }
      },
    });
  }, [
    authConfig?.test,
    isAuthenticated,
    isPublicAuthPath,
    location.pathname,
    navigate,
    sendDebugLog,
    token,
  ]);

  useEffect(() => {
    sendDebugLog('H3', 'auth effect tick', {
      pathname: location.pathname,
      isAuthenticated,
      hasToken: !!token,
      userQueryHasData: !!userQuery.data,
      userQueryIsError: userQuery.isError,
    });
    if (userQuery.data) {
      setUser(userQuery.data);
    } else if (userQuery.isError) {
      sendDebugLog('H5', 'userQuery error branch', {
        pathname: location.pathname,
        isPublicAuthPath: isPublicAuthPath(location.pathname),
      });
      doSetError((userQuery.error as Error).message);
      if (!isPublicAuthPath(location.pathname)) {
        navigate('/login', { replace: true });
      }
    }
    if (error != null && error && isAuthenticated) {
      doSetError(undefined);
    }
    if (token == null || !token || !isAuthenticated) {
      sendDebugLog('H3', 'auth effect triggering silentRefresh', {
        pathname: location.pathname,
        isAuthenticated,
        hasToken: !!token,
      });
      silentRefresh();
    }
  }, [
    token,
    isAuthenticated,
    userQuery.data,
    userQuery.isError,
    userQuery.error,
    error,
    setUser,
    navigate,
    silentRefresh,
    setUserContext,
    isPublicAuthPath,
    location.pathname,
    sendDebugLog,
  ]);

  useEffect(() => {
    const handleTokenUpdate = (event) => {
      console.log('tokenUpdated event received event');
      const newToken = event.detail;
      setUserContext({
        token: newToken,
        isAuthenticated: true,
        user: user,
      });
    };

    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [setUserContext, user]);

  // Make the provider update only when it should
  const memoedValue = useMemo(
    () => ({
      user,
      token,
      error,
      login,
      setAuthFromRegistration,
      logout,
      setError,
      roles: {
        [SystemRoles.USER]: userRole,
        [SystemRoles.ADMIN]: adminRole,
      },
      isAuthenticated,
    }),

    [user, error, isAuthenticated, token, userRole, adminRole, setAuthFromRegistration],
  );

  return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext should be used inside AuthProvider');
  }

  return context;
};

export { AuthContextProvider, useAuthContext, AuthContext };

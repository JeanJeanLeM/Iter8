/**
 * Tests for recipe routes: visibility, explore mode, derive endpoint.
 * Mocks models and middleware to assert query params and responses.
 */
const express = require('express');
const request = require('supertest');

const mockGetRecipes = jest.fn();
const mockGetRecipe = jest.fn();
const mockCreateRecipe = jest.fn();
const mockGetRecipeRoot = jest.fn();
const mockGetRecipeFamily = jest.fn();
const mockUpdateRecipe = jest.fn();
const mockDeleteRecipe = jest.fn();
const mockSetRecipeVote = jest.fn();

jest.mock('~/models', () => ({
  getRecipes: (...args) => mockGetRecipes(...args),
  getRecipe: (...args) => mockGetRecipe(...args),
  createRecipe: (...args) => mockCreateRecipe(...args),
  getRecipeRoot: (...args) => mockGetRecipeRoot(...args),
  getRecipeFamily: (...args) => mockGetRecipeFamily(...args),
  updateRecipe: (...args) => mockUpdateRecipe(...args),
  deleteRecipe: (...args) => mockDeleteRecipe(...args),
  setRecipeVote: (...args) => mockSetRecipeVote(...args),
  getUserById: jest.fn(),
  updateUserGamification: jest.fn(),
}));

jest.mock('~/server/services/Gamification/recipeAchievements', () => ({
  processRecipeCreated: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('~/cache/getLogStores', () => ({
  __esModule: true,
  default: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, res, next) => next(),
}));

const userId = '507f1f77bcf86cd799439011';

let app;

beforeAll(() => {
  const recipesRouter = require('./recipes');
  app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: userId, name: 'Test User', role: 'user' };
    next();
  });
  app.use('/api/recipes', recipesRouter);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/recipes', () => {
  it('passes mode=explore and parentsOnly to getRecipes when mode=explore', async () => {
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    await request(app)
      .get('/api/recipes')
      .query({ mode: 'explore' })
      .expect(200);
    expect(mockGetRecipes).toHaveBeenCalledTimes(1);
    const params = mockGetRecipes.mock.calls[0][0];
    expect(params.mode).toBe('explore');
    expect(params.userId).toBe(userId);
  });

  it('passes visibilityFilter and includeOthersDerivedFromMine for mode=mine', async () => {
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    await request(app)
      .get('/api/recipes')
      .query({ visibilityFilter: 'public', includeOthersDerivedFromMine: 'true' })
      .expect(200);
    const params = mockGetRecipes.mock.calls[0][0];
    expect(params.mode).toBe('mine');
    expect(params.visibilityFilter).toBe('public');
    expect(params.includeOthersDerivedFromMine).toBe(true);
  });

  it('defaults to mode=mine when mode not set', async () => {
    mockGetRecipes.mockResolvedValue({ recipes: [] });
    await request(app).get('/api/recipes').expect(200);
    expect(mockGetRecipes.mock.calls[0][0].mode).toBe('mine');
  });
});

describe('GET /api/recipes/:id', () => {
  it('returns 404 when getRecipe returns null', async () => {
    mockGetRecipe.mockResolvedValue(null);
    await request(app).get('/api/recipes/507f1f77bcf86cd799439012').expect(404);
  });

  it('returns 200 with recipe when getRecipe returns recipe', async () => {
    const recipe = {
      _id: '507f1f77bcf86cd799439012',
      userId,
      title: 'Test',
      visibility: 'public',
    };
    mockGetRecipe.mockResolvedValue(recipe);
    const res = await request(app).get('/api/recipes/507f1f77bcf86cd799439012').expect(200);
    expect(res.body.title).toBe('Test');
  });
});

describe('POST /api/recipes/:id/derive', () => {
  it('returns 404 when source recipe not found', async () => {
    mockGetRecipe.mockResolvedValue(null);
    await request(app)
      .post('/api/recipes/507f1f77bcf86cd799439012/derive')
      .expect(404);
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it('returns 400 when deriving from own recipe', async () => {
    mockGetRecipe.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId,
      title: 'Mine',
      visibility: 'public',
    });
    await request(app)
      .post('/api/recipes/507f1f77bcf86cd799439012/derive')
      .expect(400);
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it('returns 403 when source recipe is private', async () => {
    const otherUserId = '507f1f77bcf86cd799439013';
    mockGetRecipe.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      userId: otherUserId,
      title: 'Private',
      visibility: 'private',
    });
    await request(app)
      .post('/api/recipes/507f1f77bcf86cd799439012/derive')
      .expect(403);
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it('returns 201 and creates recipe with sourceRecipeId and sourceOwnerId when source is public', async () => {
    const sourceId = '507f1f77bcf86cd799439012';
    const otherUserId = '507f1f77bcf86cd799439013';
    const sourceRecipe = {
      _id: sourceId,
      userId: otherUserId,
      title: 'Public Recipe',
      visibility: 'public',
      ingredients: [],
      steps: [],
    };
    mockGetRecipe.mockResolvedValue(sourceRecipe);
    const derived = {
      _id: '507f1f77bcf86cd799439014',
      userId,
      title: 'Public Recipe',
      sourceRecipeId: sourceId,
      sourceOwnerId: otherUserId,
      visibility: 'private',
    };
    mockCreateRecipe.mockResolvedValue(derived);

    const res = await request(app).post(`/api/recipes/${sourceId}/derive`).expect(201);
    expect(res.body.sourceRecipeId).toBe(sourceId);
    expect(res.body.sourceOwnerId).toBe(otherUserId);
    expect(res.body.userId).toBe(userId);
    expect(mockCreateRecipe).toHaveBeenCalledTimes(1);
    const createPayload = mockCreateRecipe.mock.calls[0][0];
    expect(createPayload.userId).toBe(userId);
    expect(createPayload.sourceRecipeId).toBe(sourceId);
    expect(createPayload.sourceOwnerId).toBe(otherUserId);
    expect(createPayload.visibility).toBe('private');
  });
});

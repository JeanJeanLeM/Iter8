import React, { useMemo, useState } from 'react';
import * as Ariakit from '@ariakit/react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import { cn } from '~/utils';

export type SearchableMultiSelectOption = { value: string; label: string };

type Props = {
  label: string;
  selectPlaceholder: string;
  searchPlaceholder: string;
  hintText: string;
  options: SearchableMultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  id?: string;
  /** When multiple items selected, (count) => "3 selected" */
  selectedCountLabel?: (count: number) => string;
  noResultsText?: string;
};

export default function SearchableMultiSelect({
  label,
  selectPlaceholder,
  searchPlaceholder,
  hintText,
  options,
  selectedValues,
  onSelectionChange,
  id,
  selectedCountLabel = (n) => `${n} selected`,
  noResultsText = 'No results',
}: Props) {
  const [searchValue, setSearchValue] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(
    () =>
      matchSorter(options, searchValue, {
        keys: ['value', 'label'],
        baseSort: (a, b) => (a.index < b.index ? -1 : 1),
      }),
    [options, searchValue],
  );

  const combobox = Ariakit.useComboboxStore({
    resetValueOnHide: true,
    value: searchValue,
    setValue: setSearchValue,
    open,
    setOpen,
  });

  const displayText =
    selectedValues.length === 0
      ? selectPlaceholder
      : selectedValues.length === 1
        ? options.find((o) => o.value === selectedValues[0])?.label ?? selectedValues[0]
        : selectedCountLabel(selectedValues.length);

  const toggleValue = (value: string) => {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectionChange(next);
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      <label
        className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
        htmlFor={id}
      >
        {label}
      </label>
      <Ariakit.ComboboxProvider store={combobox}>
        <Ariakit.ComboboxDisclosure
          store={combobox}
          id={id}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border-medium',
            'bg-surface-primary-alt px-3 py-2 text-left text-sm text-text-primary',
            'hover:border-border-heavy focus:border-border-heavy focus:outline-none focus:ring-1 focus:ring-border-medium',
            !selectedValues.length && 'text-text-secondary',
          )}
          render={<button type="button" />}
        >
          <span className="flex-grow truncate">{displayText}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-text-secondary" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
          )}
        </Ariakit.ComboboxDisclosure>
        {open && (
          <div
            role="listbox"
            className="mt-1.5 w-full overflow-hidden rounded-xl border border-border-medium bg-surface-primary-alt shadow-lg"
          >
            <div className="border-b border-border-medium p-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Ariakit.Combobox
                  store={combobox}
                  autoSelect
                  placeholder={searchPlaceholder}
                  className="w-full rounded-md border border-border-medium bg-surface-primary-alt py-2 pl-9 pr-3 text-sm text-text-primary placeholder-text-secondary focus:border-border-heavy focus:outline-none focus:ring-1 focus:ring-border-medium"
                />
              </div>
            </div>
            <div className="max-h-[50vh] overflow-auto p-1">
              <Ariakit.ComboboxList store={combobox} className="flex flex-col gap-0.5">
                {matches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-text-secondary">
                    {noResultsText}
                  </div>
                ) : (
                  matches.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <Ariakit.ComboboxItem
                        key={opt.value}
                        store={combobox}
                        value={opt.label}
                        focusOnHover
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                          'text-text-primary hover:bg-surface-active-alt',
                          'data-[active-item]:bg-surface-active-alt',
                        )}
                        onClick={() => toggleValue(opt.value)}
                        render={<div role="option" aria-selected={isSelected} />}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs',
                            isSelected
                              ? 'border-surface-active bg-surface-active text-text-primary'
                              : 'border-border-medium bg-surface-primary-alt',
                          )}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </Ariakit.ComboboxItem>
                    );
                  })
                )}
              </Ariakit.ComboboxList>
            </div>
          </div>
        )}
      </Ariakit.ComboboxProvider>
      <span className="text-xs text-text-secondary">{hintText}</span>
    </div>
  );
}

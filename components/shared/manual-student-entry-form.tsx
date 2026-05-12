'use client';

import AsyncSelect from 'react-select/async';
import type { StylesConfig } from 'react-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface ManualStudentOption {
  value: string;
  label: string;
}

export const manualStudentEntrySelectStyles: StylesConfig<ManualStudentOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: '0.5rem',
    borderColor: state.isFocused ? 'rgba(99, 102, 241, 0.55)' : '#e2e8f0',
    backgroundColor: '#fff',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(79, 70, 229, 0.12)' : 'none',
    '&:hover': { borderColor: state.isFocused ? 'rgba(99, 102, 241, 0.55)' : '#cbd5e1' },
  }),
  valueContainer: (base) => ({
    ...base,
    minHeight: 44,
    paddingInline: 14,
    paddingBlock: 2,
  }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, minHeight: 44 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: '#64748b', padding: 8 }),
  placeholder: (base) => ({ ...base, color: '#94a3b8', fontSize: '0.875rem' }),
  singleValue: (base) => ({ ...base, color: '#0f172a', fontSize: '0.875rem' }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 40px -12px rgba(15, 23, 42, 0.18)',
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: 200,
    overflowY: 'auto',
    paddingTop: 4,
    paddingBottom: 4,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    padding: '10px 14px',
    cursor: 'pointer',
    backgroundColor: state.isSelected
      ? '#4f46e5'
      : state.isFocused
        ? '#f1f5f9'
        : 'transparent',
    color: state.isSelected ? '#fff' : '#0f172a',
    ':active': { backgroundColor: state.isSelected ? '#4f46e5' : '#e2e8f0' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  loadingMessage: (base) => ({ ...base, color: '#64748b', fontSize: '0.875rem', padding: '12px 14px' }),
  noOptionsMessage: (base) => ({ ...base, color: '#64748b', fontSize: '0.875rem', padding: '12px 14px' }),
};

export interface ManualStudentEntryFormProps {
  inputId: string;
  classNamePrefix: string;
  loadOptions: (inputValue: string) => Promise<ManualStudentOption[]>;
  value: ManualStudentOption | null;
  onChange: (option: ManualStudentOption | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitDisabled: boolean;
  submitLoading?: boolean;
  /** Complemento após "para" (ex.: "registrar a entrada ou a saída") */
  contextHint: string;
}

export function ManualStudentEntryForm({
  inputId,
  classNamePrefix,
  loadOptions,
  value,
  onChange,
  onSubmit,
  submitDisabled,
  submitLoading = false,
  contextHint,
}: ManualStudentEntryFormProps) {
  return (
    <Card className="mb-4 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-premium ring-1 ring-slate-900/[0.03]">
      <CardHeader className="space-y-1 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-4 py-3.5 sm:px-5">
        <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
          Buscar aluno
        </CardTitle>
        <CardDescription className="text-xs leading-snug text-slate-500">
          Mínimo 2 letras, escolha na lista e Verificar para {contextHint}.
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-slate-50/40 px-4 py-4 sm:px-5 sm:py-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-slate-600">
              Nome ou turma
            </label>
            <AsyncSelect<ManualStudentOption, false>
              inputId={inputId}
              aria-label="Pesquisar alunos"
              isSearchable
              cacheOptions
              defaultOptions={false}
              loadOptions={loadOptions}
              value={value}
              onChange={onChange}
              placeholder="Comece a digitar para buscar…"
              noOptionsMessage={() => 'Nenhum aluno encontrado'}
              loadingMessage={() => 'Buscando…'}
              classNamePrefix={classNamePrefix}
              styles={manualStudentEntrySelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            loading={submitLoading}
            disabled={submitDisabled}
            className="h-11 w-full shrink-0 sm:min-w-[8.5rem] sm:w-auto"
          >
            Verificar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

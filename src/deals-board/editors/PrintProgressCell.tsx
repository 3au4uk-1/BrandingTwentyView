import { useUpdateRecord } from '../hooks/useUpdateRecord';
import { useTheme } from '../theme/ThemeContext';

export type PrintProgressField = 'vzatoVRabotu' | 'gotovo';
export type PrintProgressMode = 'full' | 'vzato' | 'gotovo';

type PrintProgressCellProps = {
  recordId: string;
  vzatoVRabotu: boolean;
  gotovo: boolean;
  mode: PrintProgressMode;
};

export const getPrintProgressState = (vzatoVRabotu: boolean, gotovo: boolean) => ({
  vzato: vzatoVRabotu,
  gotovo,
});

export const shouldRenderPrintProgress = (
  field: PrintProgressField,
  visibleFields: readonly string[],
) => field === 'vzatoVRabotu' || !visibleFields.includes('vzatoVRabotu');

export const PrintProgressCell = ({
  recordId,
  vzatoVRabotu,
  gotovo,
  mode,
}: PrintProgressCellProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateRecord('dealLineItem');
  const { colors, font, radius, spacing } = theme;
  const state = getPrintProgressState(vzatoVRabotu, gotovo);
  const steps = [
    { field: 'vzatoVRabotu' as const, state: 'vzato' as const, label: 'Взято' },
    { field: 'gotovo' as const, state: 'gotovo' as const, label: 'Готово' },
  ].filter((step) => mode === 'full' || mode === step.state);

  const handleToggle = async (field: PrintProgressField, active: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [field]: !active },
      });
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
      }}
    >
      {steps.map((step) => {
        const active = state[step.state];
        const activeColor = step.state === 'gotovo' ? colors.success : colors.accent;

        return (
          <button
            key={step.field}
            type="button"
            disabled={updateMutation.isPending}
            aria-pressed={active}
            onClick={(event) => {
              event.stopPropagation();
              void handleToggle(step.field, active);
            }}
            style={{
              height: '24px',
              padding: `0 ${spacing.sm}`,
              border: `1px solid ${active ? activeColor : colors.border}`,
              borderRadius: radius.pill,
              backgroundColor: active
                ? step.state === 'gotovo'
                  ? colors.successMuted
                  : colors.accentMuted
                : colors.bgTertiary,
              color: active ? activeColor : colors.textMuted,
              cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: font.sizeXs,
              fontWeight: font.weightSemibold,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              opacity: updateMutation.isPending ? 0.65 : 1,
            }}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
};

import { useState, type MouseEvent as ReactMouseEvent } from 'react';

import {
  toSsylkaNaMakety,
  type RestorationMaketCatalogEntry,
} from 'src/constants/standard-restoration-makets';

import { useRestorationTemplatesCatalog } from '../hooks/useRestorationTemplatesCatalog';
import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ExternalLinkIcon, LinkIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';

type LinkCellProps = {
  itemId: string;
  value?: { primaryLinkUrl?: string; primaryLinkLabel?: string };
};

export const LinkCell = ({ itemId, value }: LinkCellProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const updateMutation = useUpdateLineItem();
  const { entries: catalogEntries } = useRestorationTemplatesCatalog();
  const [isEditing, setIsEditing] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value?.primaryLinkUrl ?? '');

  const openEditor = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDraftValue(value?.primaryLinkUrl ?? '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setDraftValue(value?.primaryLinkUrl ?? '');
  };

  const save = async () => {
    const trimmed = draftValue.trim();

    try {
      await updateMutation.mutateAsync({
        id: itemId,
        data: {
          ssylkaNaMakety: {
            primaryLinkUrl: trimmed,
            primaryLinkLabel: trimmed ? value?.primaryLinkLabel : undefined,
          },
        },
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить ссылку.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const applyMaket = async (maket: RestorationMaketCatalogEntry) => {
    try {
      await updateMutation.mutateAsync({
        id: itemId,
        data: { ssylkaNaMakety: toSsylkaNaMakety(maket) },
      });
      setIsCatalogOpen(false);
    } catch (error) {
      window.alert(
        `Не удалось подставить макет.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const url = value?.primaryLinkUrl?.trim();
  const label = value?.primaryLinkLabel?.trim();

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' }}>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title={label || url}
            onClick={(event) => event.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing.xs,
              color: colors.accentText,
              fontSize: font.sizeSm,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <LinkIcon size={14} color={colors.accentText} />
            <ExternalLinkIcon size={12} color={colors.textMuted} />
          </a>
        ) : null}

        <button
          type="button"
          onClick={openEditor}
          onMouseDown={(event) => event.stopPropagation()}
          title={url ? 'Изменить ссылку' : 'Добавить ссылку'}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            cursor: 'pointer',
            color: colors.textMuted,
            fontSize: font.sizeSm,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {url ? '✎' : EMPTY_VALUE}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsCatalogOpen(true);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          title="Стандартный макет реставрации"
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: radius.pill,
            background: 'transparent',
            padding: '1px 6px',
            margin: 0,
            cursor: 'pointer',
            color: colors.textSecondary,
            fontSize: font.sizeXs,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Станд.
        </button>
      </div>

      <Modal
        theme={theme}
        isOpen={isEditing}
        title="Ссылка на макеты"
        onClose={closeEditor}
        portalTarget="root"
        footer={
          <>
            <Button theme={theme} variant="ghost" size="sm" onClick={closeEditor}>
              Отмена
            </Button>
            <Button
              theme={theme}
              variant="primary"
              size="sm"
              onClick={() => void save()}
              disabled={updateMutation.isPending}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <Input
          theme={theme}
          autoFocus
          type="url"
          placeholder="https://..."
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
            if (event.key === 'Escape') {
              closeEditor();
            }
          }}
          style={{ width: '100%', padding: '6px 8px', fontSize: font.sizeSm }}
        />
      </Modal>

      <Modal
        theme={theme}
        isOpen={isCatalogOpen}
        title="Стандартные макеты"
        description="Шаблоны из CRM или запасной список, если каталог пуст."
        onClose={() => setIsCatalogOpen(false)}
        portalTarget="root"
        footer={
          <Button theme={theme} variant="ghost" size="sm" onClick={() => setIsCatalogOpen(false)}>
            Закрыть
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {catalogEntries.map((maket) => (
            <button
              key={maket.id}
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => void applyMaket(maket)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                width: '100%',
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.bg,
                color: colors.text,
                cursor: updateMutation.isPending ? 'default' : 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: font.sizeSm, fontWeight: font.weightSemibold }}>
                {maket.label}
                {maket.isDefault ? ' · по умолчанию' : ''}
              </span>
              <span
                style={{
                  fontSize: font.sizeXs,
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {maket.url}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};

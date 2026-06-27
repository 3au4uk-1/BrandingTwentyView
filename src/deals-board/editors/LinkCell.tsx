import { useState, type MouseEvent as ReactMouseEvent } from 'react';

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
  const { colors, font, spacing } = theme;
  const updateMutation = useUpdateLineItem();
  const [isEditing, setIsEditing] = useState(false);
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

  const url = value?.primaryLinkUrl?.trim();

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' }}>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title={url}
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
    </>
  );
};

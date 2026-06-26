import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ExternalLinkIcon, LinkIcon } from '../ui/Icons';

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

  const openEditor = () => {
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

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <Input
          theme={theme}
          autoFocus
          type="url"
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
          style={{ minWidth: '120px', padding: '4px 8px', fontSize: font.sizeSm }}
        />
        <Button theme={theme} variant="primary" size="sm" onClick={() => void save()} disabled={updateMutation.isPending}>
          OK
        </Button>
        <Button theme={theme} variant="ghost" size="sm" onClick={closeEditor}>
          Отмена
        </Button>
      </div>
    );
  }

  const url = value?.primaryLinkUrl?.trim();

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title={url}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing.xs,
          color: colors.accentText,
          fontSize: font.sizeSm,
          textDecoration: 'none',
        }}
      >
        <LinkIcon size={14} color={colors.accentText} />
        <ExternalLinkIcon size={12} color={colors.textMuted} />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={openEditor}
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
      }}
      title="Добавить ссылку"
    >
      {EMPTY_VALUE}
    </button>
  );
};

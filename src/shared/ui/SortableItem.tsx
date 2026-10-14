/**
 * SortableItem — wrapper reutilizável para itens sortáveis com @dnd-kit/sortable.
 *
 * Aplica transform/transition CSS automáticos para a animação de deslizamento.
 * O componente filho recebe isDragging, handleProps, handleStyle e listeners via render prop.
 *
 * IMPORTANTE: aplique handleStyle no elemento que recebe handleProps (o handle de arrastar).
 * Sem touch-action:none o browser intercepta o toque para scroll e o drag nunca ativa no mobile.
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (props: {
    isDragging: boolean;
    handleProps: Record<string, unknown> | undefined;
    handleStyle: React.CSSProperties;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
  }) => React.ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // touch-action:none é ESSENCIAL no mobile — sem isso o browser captura o toque
  // para scroll antes do dnd-kit conseguir detectar o gesto de arrastar.
  const handleStyle: React.CSSProperties = {
    touchAction: 'none',
    userSelect: 'none',
  };

  return children({
    isDragging,
    handleProps: { ...listeners, ...attributes },
    handleStyle,
    setNodeRef,
    style,
  });
}


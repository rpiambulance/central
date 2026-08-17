/**
 * Loose items and groups share one ordering space on a form, so each carries
 * its own position and neither list is complete on its own. Rendering the
 * items and then the groups puts every group at the bottom regardless of
 * where it was placed; this merges the two back into the order they were
 * authored in.
 */
export type Positioned = { order: number };

export type FormNode<Item extends Positioned, Group extends Positioned> =
  | { kind: 'ITEM'; item: Item }
  | { kind: 'GROUP'; group: Group };

export function formNodes<Item extends Positioned, Group extends Positioned>(
  items: Item[],
  groups: Group[] = [],
): Array<FormNode<Item, Group>> {
  return [
    ...items.map((item) => ({ order: item.order, node: { kind: 'ITEM' as const, item } })),
    ...groups.map((group) => ({
      order: group.order,
      node: { kind: 'GROUP' as const, group },
    })),
  ]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.node);
}

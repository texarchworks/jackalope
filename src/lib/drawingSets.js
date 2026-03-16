import { supabase } from './supabase';

export async function createDrawingSet({ projectId, name, createdBy }) {
  const { data, error } = await supabase
    .from('drawing_sets')
    .insert({
      project_id: projectId,
      name: name || 'Drawing Set',
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create drawing set: ${error.message}`);
  return data;
}

export async function fetchDrawingSets(projectId) {
  const { data, error } = await supabase
    .from('drawing_sets')
    .select(`
      *,
      items:drawing_set_items(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch drawing sets: ${error.message}`);

  return data.map(ds => ({
    ...ds,
    phases: {
      SD: ds.items.filter(i => i.phase === 'SD').sort((a, b) => a.sort_order - b.sort_order),
      DD: ds.items.filter(i => i.phase === 'DD').sort((a, b) => a.sort_order - b.sort_order),
      CD: ds.items.filter(i => i.phase === 'CD').sort((a, b) => a.sort_order - b.sort_order),
    },
    totalItems: ds.items.length,
    completedItems: ds.items.filter(i => i.is_complete).length,
  }));
}

export async function toggleDrawingSetItem(itemId, isComplete, userId) {
  const { data, error } = await supabase
    .from('drawing_set_items')
    .update({
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
      completed_by: isComplete ? userId : null,
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update item: ${error.message}`);
  return data;
}

export async function addCustomItem({ drawingSetId, name, phase }) {
  const { data: existing } = await supabase
    .from('drawing_set_items')
    .select('sort_order')
    .eq('drawing_set_id', drawingSetId)
    .eq('phase', phase)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { data, error } = await supabase
    .from('drawing_set_items')
    .insert({
      drawing_set_id: drawingSetId,
      name,
      phase,
      is_custom: true,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add custom item: ${error.message}`);
  return data;
}

export async function deleteDrawingSet(drawingSetId) {
  const { error } = await supabase
    .from('drawing_sets')
    .delete()
    .eq('id', drawingSetId);

  if (error) throw new Error(`Failed to delete drawing set: ${error.message}`);
}

export async function deleteCustomItem(itemId) {
  const { error } = await supabase
    .from('drawing_set_items')
    .delete()
    .eq('id', itemId)
    .eq('is_custom', true);

  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}

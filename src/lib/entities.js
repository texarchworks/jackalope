import { supabase } from './supabase';

// ============================================================
// ENTITY CRUD
// ============================================================

export async function createEntity({ projectId, name, entityType, parentEntityId = null, phase = null, createdBy }) {
  const { data, error } = await supabase
    .from('entities')
    .insert({
      project_id: projectId,
      parent_entity_id: parentEntityId,
      entity_type: entityType,
      name,
      phase,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create entity: ${error.message}`);
  return data;
}

export async function fetchEntities(projectId) {
  const { data, error } = await supabase
    .from('entities_with_progress')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch entities: ${error.message}`);
  return data;
}

export function buildEntityTree(entities) {
  const map = {};
  const roots = [];

  entities.forEach(e => {
    map[e.id] = { ...e, children: [] };
  });

  entities.forEach(e => {
    if (e.parent_entity_id && map[e.parent_entity_id]) {
      map[e.parent_entity_id].children.push(map[e.id]);
    } else {
      roots.push(map[e.id]);
    }
  });

  return roots;
}

export async function updateEntityPhase(entityId, phase) {
  const { data, error } = await supabase
    .from('entities')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('id', entityId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update phase: ${error.message}`);
  return data;
}

export async function deleteEntity(entityId) {
  const { error } = await supabase
    .from('entities')
    .delete()
    .eq('id', entityId);

  if (error) throw new Error(`Failed to delete entity: ${error.message}`);
}

// ============================================================
// DRAWING SET ITEMS
// ============================================================

export async function fetchDrawingSetItems({ projectId, entityId = null }) {
  let query = supabase
    .from('drawing_set_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (entityId) {
    query = query.eq('entity_id', entityId);
  } else {
    query = query.is('entity_id', null);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch drawing set items: ${error.message}`);

  const grouped = {
    SD: data.filter(i => i.phase === 'SD'),
    DD: data.filter(i => i.phase === 'DD'),
    CD: data.filter(i => i.phase === 'CD'),
  };

  return {
    items: data,
    phases: grouped,
    totalItems: data.length,
    completedItems: data.filter(i => i.is_complete).length,
  };
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

export async function addCustomItem({ projectId, entityId = null, name, phase }) {
  const { data: existing } = await supabase
    .from('drawing_set_items')
    .select('sort_order')
    .eq('project_id', projectId)
    .eq('phase', phase)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { data, error } = await supabase
    .from('drawing_set_items')
    .insert({
      project_id: projectId,
      entity_id: entityId,
      name,
      phase,
      is_custom: true,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add item: ${error.message}`);
  return data;
}

export async function deleteCustomItem(itemId) {
  const { error } = await supabase
    .from('drawing_set_items')
    .delete()
    .eq('id', itemId)
    .eq('is_custom', true);

  if (error) throw new Error(`Failed to delete item: ${error.message}`);
}

export async function createProjectLevelDrawingSet(projectId) {
  const items = [
    // SD - Architectural (6)
    { name: 'Site Analysis', phase: 'SD', sort_order: 1 },
    { name: 'Floor Plans', phase: 'SD', sort_order: 2 },
    { name: 'Building Sections', phase: 'SD', sort_order: 3 },
    { name: 'Exterior Elevations', phase: 'SD', sort_order: 4 },
    { name: 'Massing Model / 3D Views', phase: 'SD', sort_order: 5 },
    { name: 'Preliminary Specifications', phase: 'SD', sort_order: 6 },
    // SD - Site (2)
    { name: 'Preliminary Site Plan', phase: 'SD', sort_order: 7 },
    { name: 'Preliminary Landscape Plan', phase: 'SD', sort_order: 8 },

    // DD - Architectural (8)
    { name: 'Refined Floor Plans', phase: 'DD', sort_order: 1 },
    { name: 'Wall Sections', phase: 'DD', sort_order: 2 },
    { name: 'Interior Elevations', phase: 'DD', sort_order: 3 },
    { name: 'Door / Window Schedule', phase: 'DD', sort_order: 4 },
    { name: 'Material Selections', phase: 'DD', sort_order: 5 },
    { name: 'Structural Coordination', phase: 'DD', sort_order: 6 },
    { name: 'MEP Coordination', phase: 'DD', sort_order: 7 },
    { name: 'Code Review', phase: 'DD', sort_order: 8 },
    // DD - Site (2)
    { name: 'Site / Grading Plan', phase: 'DD', sort_order: 9 },
    { name: 'Landscape Plan', phase: 'DD', sort_order: 10 },

    // CD - Architectural (20)
    { name: 'Cover Sheet', phase: 'CD', sort_order: 1 },
    { name: 'Drawing Index', phase: 'CD', sort_order: 2 },
    { name: 'Site Plan', phase: 'CD', sort_order: 3 },
    { name: 'Demolition Plans', phase: 'CD', sort_order: 4 },
    { name: 'Foundation Plans', phase: 'CD', sort_order: 5 },
    { name: 'Floor Plans', phase: 'CD', sort_order: 6 },
    { name: 'Roof Plan', phase: 'CD', sort_order: 7 },
    { name: 'Reflected Ceiling Plans', phase: 'CD', sort_order: 8 },
    { name: 'Exterior Elevations', phase: 'CD', sort_order: 9 },
    { name: 'Building Sections', phase: 'CD', sort_order: 10 },
    { name: 'Wall Sections', phase: 'CD', sort_order: 11 },
    { name: 'Interior Elevations', phase: 'CD', sort_order: 12 },
    { name: 'Door Schedule', phase: 'CD', sort_order: 13 },
    { name: 'Window Schedule', phase: 'CD', sort_order: 14 },
    { name: 'Finish Schedule', phase: 'CD', sort_order: 15 },
    { name: 'Stair / Elevator Details', phase: 'CD', sort_order: 16 },
    { name: 'Structural Plans', phase: 'CD', sort_order: 17 },
    { name: 'MEP Plans', phase: 'CD', sort_order: 18 },
    { name: 'Landscape Plan', phase: 'CD', sort_order: 19 },
    { name: 'Specifications', phase: 'CD', sort_order: 20 },
    // CD - Site (2)
    { name: 'Final Civil Plans', phase: 'CD', sort_order: 21 },
    { name: 'Final Landscape / Irrigation Plans', phase: 'CD', sort_order: 22 },
  ];

  const rows = items.map(item => ({
    ...item,
    project_id: projectId,
    entity_id: null,
  }));

  const { data, error } = await supabase
    .from('drawing_set_items')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to create project drawing set: ${error.message}`);
  return data;
}

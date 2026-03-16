import { supabase } from './supabase';

/**
 * Instantiate a task template into real tasks.
 * Creates root task + recursively creates all children from deliverables JSONB.
 */
export async function instantiateTemplate({ templateId, projectId, createdBy, parentTaskId = null }) {
  // Fetch template
  const { data: template, error: tErr } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (tErr) throw new Error(`Template not found: ${tErr.message}`);

  // Fetch project for default phase
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('current_phase')
    .eq('id', projectId)
    .single();

  if (pErr) throw new Error(`Project not found: ${pErr.message}`);

  const effectivePhase = template.phase || project.current_phase;

  // Create root task
  const { data: root, error: rErr } = await supabase
    .from('tasks')
    .insert({
      title: template.name,
      project_id: projectId,
      task_type: template.task_type,
      phase: effectivePhase,
      template_id: templateId,
      parent_task_id: parentTaskId,
      status: 'open',
      created_by: createdBy,
    })
    .select()
    .single();

  if (rErr) throw new Error(`Failed to create root task: ${rErr.message}`);

  // Recursively create children from deliverables
  let count = 1;
  const deliverables = template.deliverables || [];

  async function createChildren(items, parentId) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const { data: child, error: cErr } = await supabase
        .from('tasks')
        .insert({
          title: item.name,
          project_id: projectId,
          task_type: item.task_type || 'task',
          phase: effectivePhase,
          template_id: templateId,
          parent_task_id: parentId,
          status: 'open',
          created_by: createdBy,
        })
        .select()
        .single();

      if (cErr) throw new Error(`Failed to create child "${item.name}": ${cErr.message}`);

      count++;

      if (item.children && item.children.length > 0) {
        await createChildren(item.children, child.id);
      }
    }
  }

  await createChildren(deliverables, root.id);

  return { root, count };
}

/**
 * Fetch available templates for an org.
 * Returns global templates (org_id IS NULL) + org-specific templates.
 */
export async function fetchTemplates(orgId) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch templates: ${error.message}`);
  return data;
}

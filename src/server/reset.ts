import { Router } from 'express';
import { supabaseAdmin } from './supabase.ts';
import { requireAuth } from './middleware.ts';

export const resetRouter = Router();

/**
 * POST /api/reset
 * Permanently deletes ALL data for the authenticated user across all Supabase tables
 * and KV store. This is irreversible.
 */
resetRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.id;

    // Order matters: delete child/referencing rows before parents
    // Explore: edges → nodes → graphs, insights, papers
    // Brain: messages → chats
    // Then: journal, resources, grants, documents, projects, kv

    const results: { table: string; error?: string }[] = [];

    const tables: { table: string; userCol: string }[] = [
      // Explore data (child tables first)
      { table: 'knowledge_graph_edges', userCol: 'project_id' },
      { table: 'knowledge_graph_nodes', userCol: 'project_id' },
      { table: 'knowledge_graphs', userCol: 'project_id' },
      { table: 'paper_insights', userCol: 'project_id' },
      { table: 'papers', userCol: 'project_id' },
      // Brain
      { table: 'brain_messages', userCol: '__via_chats__' },
      { table: 'brain_chats', userCol: 'user_id' },
      // Core data
      { table: 'journal_entries', userCol: 'author_id' },
      { table: 'resources', userCol: 'user_id' },
      { table: 'grants', userCol: 'user_id' },
      { table: 'documents', userCol: 'user_id' },
      // KV store
      { table: 'kv_store', userCol: 'user_id' },
      // Projects last (other tables reference project_id)
      { table: 'projects', userCol: 'owner_id' },
    ];

    // First, get all project IDs for this user (needed for project_id-based tables)
    const { data: userProjects } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('owner_id', userId);

    const projectIds = (userProjects || []).map((p) => p.id);

    // Get all brain chat IDs for this user (needed for brain_messages)
    const { data: userChats } = await supabaseAdmin
      .from('brain_chats')
      .select('id')
      .eq('user_id', userId);

    const chatIds = (userChats || []).map((c) => c.id);

    for (const { table, userCol } of tables) {
      try {
        if (userCol === '__via_chats__') {
          // brain_messages don't have user_id directly; delete by chat_id
          if (chatIds.length > 0) {
            const { error } = await supabaseAdmin
              .from(table)
              .delete()
              .in('chat_id', chatIds);
            if (error) results.push({ table, error: error.message });
          }
        } else if (userCol === 'project_id') {
          // Explore tables are scoped by project_id
          if (projectIds.length > 0) {
            const { error } = await supabaseAdmin
              .from(table)
              .delete()
              .in('project_id', projectIds);
            if (error) results.push({ table, error: error.message });
          }
        } else {
          const { error } = await supabaseAdmin
            .from(table)
            .delete()
            .eq(userCol, userId);
          if (error) results.push({ table, error: error.message });
        }
      } catch (err: any) {
        results.push({ table, error: err.message });
      }
    }

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('[reset] Partial errors:', errors);
      return res.json({
        success: true,
        partial: true,
        errors,
        message: `Reset completed with ${errors.length} table error(s)`,
      });
    }

    res.json({ success: true, message: 'All data has been permanently deleted' });
  } catch (err: any) {
    console.error('[reset] Fatal error:', err);
    res.status(500).json({ error: err.message });
  }
});

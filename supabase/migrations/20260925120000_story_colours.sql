-- Story colours: each story's page colour (Direction B) is kept in visual_scene.
-- Additive: the old illustration keys stay valid so no existing draft or revision breaks.
alter table public.content_items
  drop constraint content_items_visual_scene_check,
  add constraint content_items_visual_scene_check
    check (visual_scene is null or visual_scene in (
      'teal', 'rose', 'sky', 'duck', 'night',
      'artist', 'base-wave', 'explorer', 'festive-child', 'gardener', 'reader'));

alter table public.content_revisions
  drop constraint content_revisions_visual_scene_check,
  add constraint content_revisions_visual_scene_check
    check (visual_scene is null or visual_scene in (
      'teal', 'rose', 'sky', 'duck', 'night',
      'artist', 'base-wave', 'explorer', 'festive-child', 'gardener', 'reader'));

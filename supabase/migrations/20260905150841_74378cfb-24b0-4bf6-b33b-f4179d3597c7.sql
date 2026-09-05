
REVOKE EXECUTE ON FUNCTION public.is_game_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_game_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_own_player(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_game_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_game_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_own_player(uuid) TO authenticated, service_role;

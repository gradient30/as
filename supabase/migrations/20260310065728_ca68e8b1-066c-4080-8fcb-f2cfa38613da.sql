
-- Create trigger for auto_assign_first_admin on new user profile creation
CREATE TRIGGER on_new_profile_assign_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_first_admin();

-- Also create trigger for handle_new_user on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

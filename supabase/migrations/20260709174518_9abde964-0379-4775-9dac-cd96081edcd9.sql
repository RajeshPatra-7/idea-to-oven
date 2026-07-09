
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  description TEXT,
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  difficulty TEXT,
  servings INT,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  dietary TEXT,
  cuisine TEXT,
  spice_level TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public recipes viewable by all" ON public.recipes FOR SELECT USING (is_public = true);
CREATE POLICY "Owners view own recipes" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_recipes_user ON public.recipes(user_id, created_at DESC);
CREATE INDEX idx_recipes_public ON public.recipes(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_recipes_likes ON public.recipes(likes_count DESC) WHERE is_public = true;

-- Likes
CREATE TABLE public.recipe_likes (
  recipe_id UUID NOT NULL REFERENCES public.recipes ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, user_id)
);
GRANT SELECT ON public.recipe_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.recipe_likes TO authenticated;
GRANT ALL ON public.recipe_likes TO service_role;
ALTER TABLE public.recipe_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by all" ON public.recipe_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON public.recipe_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.recipe_likes FOR DELETE USING (auth.uid() = user_id);

-- Maintain likes_count
CREATE OR REPLACE FUNCTION public.handle_like_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes SET likes_count = likes_count + 1 WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.recipe_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_change();

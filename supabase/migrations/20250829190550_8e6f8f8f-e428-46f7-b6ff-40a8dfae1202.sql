-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  participants TEXT[] DEFAULT '{}',
  transcript TEXT,
  minutes_html TEXT,
  minutes_json JSONB,
  minutes_table JSONB,
  ai_meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create shares table for meeting sharing
CREATE TABLE public.shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meeting_versions table for version history
CREATE TABLE public.meeting_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  label TEXT,
  minutes_html TEXT,
  minutes_json JSONB,
  minutes_table JSONB,
  transcript TEXT,
  diff_meta JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for meetings
CREATE POLICY "Users can view their own meetings" 
ON public.meetings 
FOR SELECT 
USING (auth.uid() = owner_id AND deleted_at IS NULL);

CREATE POLICY "Users can create their own meetings" 
ON public.meetings 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own meetings" 
ON public.meetings 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own meetings" 
ON public.meetings 
FOR DELETE 
USING (auth.uid() = owner_id);

-- RLS Policies for shares
CREATE POLICY "Users can view shares they created" 
ON public.shares 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create shares for their meetings" 
ON public.shares 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND owner_id = auth.uid())
);

-- RLS Policies for meeting_versions
CREATE POLICY "Users can view versions of their meetings" 
ON public.meeting_versions 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND owner_id = auth.uid())
);

CREATE POLICY "Users can create versions for their meetings" 
ON public.meeting_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND owner_id = auth.uid())
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('meeting-files', 'meeting-files', false),
  ('exports', 'exports', false);

-- Storage policies for meeting files
CREATE POLICY "Users can upload their own meeting files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'meeting-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own meeting files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'meeting-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for exports
CREATE POLICY "Users can upload their own exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'exports' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own exports" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'exports' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes for better performance
CREATE INDEX idx_meetings_owner_created ON public.meetings(owner_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_shares_token ON public.shares(token);
CREATE INDEX idx_meeting_versions_meeting_version ON public.meeting_versions(meeting_id, version DESC);
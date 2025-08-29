import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, LogOut, Settings, History, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavbarProps {
  user: any;
  onNewMeeting: () => void;
}

export default function Navbar({ user, onNewMeeting }: NavbarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="film-card film-grain sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center cinematic-glow">
              <span className="text-white font-bold text-lg font-poppins">ZN</span>
            </div>
            <div>
              <h1 className="text-xl font-bold font-poppins bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ZapNote
              </h1>
              <p className="text-xs text-muted-foreground">AI-Powered Notes</p>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* New Meeting Button */}
            <Button 
              onClick={onNewMeeting}
              className="film-button-primary fps-hover"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Meetings
            </Button>

            {/* History Button */}
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/#history'}
              className="film-button fps-hover"
              size="sm"
            >
              <History className="w-4 h-4 mr-2" />
              Historyi
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10 cinematic-glow">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.name || user?.email} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(profile?.name || user?.email)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 film-card cross-dissolve" 
                align="end" 
                forceMount
              >
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none font-poppins">
                    {profile?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer fps-hover">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer fps-hover">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive fps-hover"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
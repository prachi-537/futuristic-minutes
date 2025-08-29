import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import AuthPage from '@/components/auth/AuthPage';
import Navbar from '@/components/layout/Navbar';
import Dashboard from './Dashboard';
import History from './History';

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');

  useEffect(() => {
    // Check for hash navigation
    const hash = window.location.hash.substring(1);
    if (hash === 'history') {
      setCurrentView('history');
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNewMeeting = () => {
    // Reset to create new meeting
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background film-grain">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center cinematic-glow animate-pulse">
            <span className="text-white font-bold text-lg font-poppins">MM</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background film-grain">
      <Navbar user={user} onNewMeeting={handleNewMeeting} />
      {currentView === 'dashboard' ? (
        <Dashboard user={user} />
      ) : (
        <History user={user} />
      )}
    </div>
  );
};

export default Index;

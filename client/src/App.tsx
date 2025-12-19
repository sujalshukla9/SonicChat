import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import ThreeBackground from './components/ThreeBackground';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated, checkAuth, initAuthListener } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase auth listener
    const unsubscribe = initAuthListener();

    // Check if user has existing session
    const initAuth = async () => {
      await checkAuth();
      // Add a small delay for the animation to be seen
      setTimeout(() => setIsLoading(false), 800);
    };
    initAuth();

    // Cleanup auth listener on unmount
    return () => unsubscribe();
  }, [checkAuth, initAuthListener]);

  if (isLoading) {
    return (
      <main className="relative w-full h-dvh bg-black flex items-center justify-center overflow-hidden">
        <ThreeBackground />
        <div className="relative z-20 flex flex-col items-center gap-4 sm:gap-6 px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(168, 85, 247, 0)",
                  "0 0 0 20px rgba(168, 85, 247, 0.1)",
                  "0 0 0 0 rgba(168, 85, 247, 0)"
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl bg-linear-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30"
            >
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white fill-white/20 animate-pulse" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-200 via-purple-200 to-pink-200 tracking-tight">
              SonicChat
            </h1>
            <div className="h-1 w-24 sm:w-32 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-cyan-500 to-purple-500"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className={`relative w-full ${isAuthenticated ? 'h-screen overflow-hidden' : 'min-h-screen overflow-y-auto'} bg-black`}>
      <ThreeBackground />
      {isAuthenticated ? (
        <ChatPage />
      ) : (
        <AuthPage />
      )}
    </main>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Loader2, Eye, EyeOff, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// Premium Google Icon
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const { login, register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

    // Reset error when switching modes
    useEffect(() => {
        clearError();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        if (isLogin) {
            await login(formData.email, formData.password);
        } else {
            await register(formData.username, formData.email, formData.password, gender);
        }
    };

    const handleGoogleLogin = async () => {
        clearError();
        await loginWithGoogle();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="w-full min-h-[100dvh] bg-[#030305] font-sans selection:bg-purple-500/30 overflow-x-hidden overflow-y-auto">

            {/* Ambient Background - Fixed */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] bg-purple-600/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse" />
                <div className="absolute top-1/4 -right-1/4 w-[60vw] h-[60vw] max-w-[400px] max-h-[400px] bg-cyan-500/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse delay-700" />
                <div className="absolute -bottom-1/4 left-1/4 w-[50vw] h-[50vw] max-w-[350px] max-h-[350px] bg-pink-500/20 rounded-full blur-[60px] sm:blur-[80px] animate-pulse delay-500" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full min-h-[100dvh] flex flex-col lg:flex-row lg:items-center lg:justify-center">

                {/* Mobile/Tablet: Stacked Layout | Desktop: Side by Side */}
                <div className="w-full max-w-md lg:max-w-5xl mx-auto flex flex-col lg:flex-row items-center lg:items-center gap-6 sm:gap-8 lg:gap-20 px-5 sm:px-8 py-8 sm:py-12 lg:py-16">

                    {/* Branding Section */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-1"
                    >
                        {/* Logo */}
                        <div className="relative mb-4 sm:mb-6">
                            <div className="absolute inset-0 bg-linear-to-r from-cyan-500 to-purple-600 blur-xl opacity-60 rounded-full scale-150"></div>
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-black/60 backdrop-blur-xl rounded-2xl lg:rounded-3xl border border-white/15 shadow-2xl flex items-center justify-center"
                            >
                                <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" strokeWidth={1.5} />
                            </motion.div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white mb-2 sm:mb-3">
                            Sonic<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400">Chat</span>
                        </h1>

                        {/* Tagline */}
                        <p className="text-gray-400 text-sm sm:text-base lg:text-lg font-light max-w-xs sm:max-w-sm lg:max-w-md leading-relaxed">
                            <span className="hidden sm:inline">Experience the future of communication. </span>
                            <span className="text-gray-300">Fast, Secure & Beautiful.</span>
                        </p>

                        {/* User count - Desktop only */}
                        <div className="hidden lg:flex items-center gap-3 mt-8">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-9 h-9 rounded-full border-2 border-[#030305] bg-gray-700/80 flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                            <span className="text-sm text-gray-400">
                                <span className="text-white font-semibold">10k+</span> users joined
                            </span>
                        </div>
                    </motion.div>

                    {/* Auth Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="w-full max-w-sm sm:max-w-md lg:w-[400px] lg:flex-shrink-0"
                    >
                        <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl">

                            {/* Toggle Switch */}
                            <div className="relative flex bg-white/5 p-1 rounded-xl border border-white/5 mb-5 sm:mb-6">
                                <motion.div
                                    className="absolute top-1 bottom-1 rounded-lg bg-white/10"
                                    layoutId="activeTab"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    style={{
                                        width: 'calc(50% - 4px)',
                                        left: isLogin ? '4px' : 'calc(50%)'
                                    }}
                                />
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Error Message */}
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 flex items-start gap-2 text-red-400 text-xs sm:text-sm overflow-hidden"
                                        >
                                            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p>{error}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Sign Up Fields */}
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {!isLogin && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-4 overflow-hidden"
                                        >
                                            {/* Username */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5 uppercase tracking-wider">Username</label>
                                                <div className="relative group">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="username"
                                                        value={formData.username}
                                                        onChange={handleChange}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                                        placeholder="Choose a username"
                                                        required={!isLogin}
                                                    />
                                                </div>
                                            </div>

                                            {/* Gender */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5 uppercase tracking-wider">Gender</label>
                                                <div className="flex gap-3">
                                                    {(['male', 'female'] as const).map((g) => (
                                                        <button
                                                            key={g}
                                                            type="button"
                                                            onClick={() => setGender(g)}
                                                            className={`flex-1 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${gender === g
                                                                ? g === 'male'
                                                                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                                                                    : 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                                                                : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            <span>{g === 'male' ? '👨' : '👩'}</span>
                                                            <span className="capitalize">{g}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5 uppercase tracking-wider">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-0.5 uppercase tracking-wider">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-linear-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl font-bold text-sm text-white shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            {/* Divider */}
                            <div className="my-5 flex items-center gap-3">
                                <div className="h-px bg-white/10 flex-1" />
                                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Or</span>
                                <div className="h-px bg-white/10 flex-1" />
                            </div>

                            {/* Google Button */}
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={handleGoogleLogin}
                                type="button"
                                disabled={isLoading}
                                className="w-full py-3 bg-white hover:bg-gray-100 rounded-xl font-semibold text-sm text-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <GoogleIcon />
                                <span>Continue with Google</span>
                            </motion.button>
                        </div>

                        {/* Terms */}
                        <p className="text-center text-gray-500 text-xs mt-4 sm:mt-5">
                            By continuing, you agree to our{' '}
                            <a href="#" className="text-gray-400 hover:text-white underline underline-offset-2">Terms</a>
                            {' & '}
                            <a href="#" className="text-gray-400 hover:text-white underline underline-offset-2">Privacy</a>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

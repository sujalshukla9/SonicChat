import { motion } from 'framer-motion';

export default function LandingPage() {
    return (
        <div className="relative min-h-screen text-white overflow-hidden select-none">
            {/* Navbar */}
            <nav className="flex justify-between items-center p-4 sm:p-6 backdrop-blur-md bg-white/5 fixed w-full z-50 border-b border-white/10">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-purple-600 cursor-pointer">SonicChat</h1>
                <div className="hidden md:flex gap-6 text-sm font-medium text-gray-300">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                </div>
                <button className="px-4 py-2 sm:px-6 sm:py-2 text-sm sm:text-base bg-linear-to-r from-purple-600 to-blue-600 rounded-full font-semibold hover:scale-105 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all">
                    Get Started
                </button>
            </nav>

            {/* Hero */}
            <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 sm:px-6 pt-20 pb-8 relative z-10">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-4 sm:mb-6 bg-clip-text text-transparent bg-linear-to-r from-cyan-300 via-purple-500 to-pink-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                >
                    SonicChat
                </motion.h1>
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-widest uppercase mb-3 sm:mb-4"
                >
                    Chat Beyond Dimensions
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-sm sm:text-lg md:text-xl text-gray-400 mb-6 sm:mb-10 max-w-xs sm:max-w-lg md:max-w-2xl px-2"
                >
                    Next-gen real-time messaging with a 3D interface. Fast. Secure. Immersive.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-6 w-full sm:w-auto px-4 sm:px-0"
                >
                    <button className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg text-sm sm:text-base">Start Chatting</button>
                    <button className="px-6 py-3 sm:px-8 sm:py-4 border border-white/30 rounded-full font-bold backdrop-blur-sm hover:bg-white/10 transition-colors text-sm sm:text-base">Watch Demo</button>
                </motion.div>
            </div>

            {/* Features Showcase */}
            <div id="features" className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 relative z-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                    {[
                        { title: "Real-time Speed", desc: "Instant message delivery < 200ms." },
                        { title: "Privacy First", desc: "E2E Encryption and auto-delete." },
                        { title: "3D Experience", desc: "Immersive UI that feels alive." }
                    ].map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className="p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group"
                        >
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4 group-hover:text-purple-400 transition-colors">{f.title}</h3>
                            <p className="text-gray-400 text-sm sm:text-base">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}

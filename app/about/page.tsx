"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function About() {
  return (
    <div className="min-h-screen p-4 sm:p-8 md:p-24 bg-gradient-to-b from-pink-50 to-white dark:from-purple-950 dark:to-gray-950">
      <div className="max-w-4xl mx-auto">
        <motion.h1 
          className="text-4xl sm:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          About KasiFesyen
        </motion.h1>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative h-64 md:h-full rounded-2xl overflow-hidden shadow-xl border border-pink-200 dark:border-purple-800"
          >
            <Image 
              src="/fashion-ai.jpg" 
              alt="Fashion AI" 
              fill 
              className="object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-pink-800 dark:text-pink-200">
              Your AI Fashion Stylist
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              KasiFesyen is an innovative AI-powered fashion assistant that helps you create stylish outfits based on your clothing items or descriptions. Whether you have a specific piece you want to build an outfit around or just need general fashion advice, our AI stylist is here to help!
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              Simply upload a photo of your clothing item or describe what you have, and our AI will generate personalized outfit recommendations complete with styling tips and visualizations.
            </p>
          </motion.div>
        </div>

        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-pink-800 dark:text-pink-200 text-center">
            Key Features
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon="✨" 
              title="AI-Powered Recommendations" 
              description="Get personalized outfit suggestions based on your clothing items or descriptions."
              delay={0.5}
            />
            <FeatureCard 
              icon="👗" 
              title="Outfit Visualization" 
              description="See AI-generated images of your recommended outfits to help you visualize the combinations."
              delay={0.6}
            />
            <FeatureCard 
              icon="🧕" 
              title="Halal Mode" 
              description="Option for modest fashion recommendations that adhere to Islamic guidelines."
              delay={0.7}
            />
            <FeatureCard 
              icon="🐱" 
              title="Cat Fashion" 
              description="Special mode for pet owners to get adorable outfit recommendations for their feline friends."
              delay={0.8}
            />
            <FeatureCard 
              icon="💡" 
              title="Styling Tips" 
              description="Receive expert styling advice specific to your clothing items and personal style."
              delay={0.9}
            />
            <FeatureCard 
              icon="🌙" 
              title="Dark Mode" 
              description="Comfortable viewing experience with both light and dark themes available."
              delay={1.0}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-pink-100/50 dark:border-purple-900/50"
        >
          <h2 className="text-2xl font-bold mb-6 text-pink-800 dark:text-pink-200 text-center">
            Technologies Used
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TechBadge name="Next.js" delay={1.2} />
            <TechBadge name="React" delay={1.3} />
            <TechBadge name="TypeScript" delay={1.4} />
            <TechBadge name="Tailwind CSS" delay={1.5} />
            <TechBadge name="Framer Motion" delay={1.6} />
            <TechBadge name="Google Gemini AI" delay={1.7} />
            <TechBadge name="Vercel" delay={1.8} />
            <TechBadge name="Shadcn UI" delay={1.9} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: number }) {
  return (
    <motion.div 
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 rounded-xl shadow-md border border-pink-100/50 dark:border-purple-900/50 hover:shadow-lg transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -5 }}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 text-pink-700 dark:text-pink-300">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
    </motion.div>
  );
}

function TechBadge({ name, delay }: { name: string; delay: number }) {
  return (
    <motion.div 
      className="flex justify-center items-center p-3 bg-pink-50 dark:bg-purple-900/30 rounded-lg border border-pink-200/50 dark:border-purple-700/50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.05 }}
    >
      <span className="text-sm font-medium text-pink-800 dark:text-pink-200">{name}</span>
    </motion.div>
  );
}
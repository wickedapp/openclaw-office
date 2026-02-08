'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export default function AgentSprite({ agent, onClick, isSelected }) {
  const [currentThought, setCurrentThought] = useState(0)
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    // Rotate thoughts
    const thoughtInterval = setInterval(() => {
      setCurrentThought(prev => (prev + 1) % agent.thoughts.length)
    }, 8000)

    // Random working animation
    const workInterval = setInterval(() => {
      setIsWorking(true)
      setTimeout(() => setIsWorking(false), 2000)
    }, 5000 + Math.random() * 5000)

    return () => {
      clearInterval(thoughtInterval)
      clearInterval(workInterval)
    }
  }, [agent.thoughts.length])

  return (
    <motion.div
      className="absolute cursor-pointer group"
      style={{
        left: `${agent.position.x}%`,
        top: `${agent.position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={() => onClick?.(agent)}
      whileHover={{ scale: 1.1 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.random() * 0.5 }}
    >
      {/* Agent Container */}
      <div className="relative">
        {/* Status indicator */}
        <div
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full z-10 ${
            agent.status === 'online' ? 'status-online' : 
            agent.status === 'busy' ? 'status-busy' : 'status-offline'
          }`}
        />

        {/* Pixel art agent body */}
        <motion.div
          className="relative"
          animate={isWorking ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 0.3, repeat: isWorking ? 3 : 0 }}
        >
          {/* Agent avatar - pixel art style */}
          <div 
            className="w-16 h-16 rounded-lg pixel-art flex items-center justify-center text-3xl relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}11)`,
              border: `2px solid ${agent.color}`,
              boxShadow: isSelected 
                ? `0 0 20px ${agent.color}, 0 0 40px ${agent.color}44`
                : `0 0 10px ${agent.color}44`,
            }}
          >
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
              }}
            />
            <span className="relative z-10">{agent.emoji}</span>
            
            {/* Working indicator */}
            {isWorking && (
              <motion.div
                className="absolute bottom-1 right-1 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                ⚡
              </motion.div>
            )}
          </div>

          {/* Desk/workstation */}
          <div 
            className="w-20 h-4 -mt-1 mx-auto rounded-sm"
            style={{
              background: `linear-gradient(180deg, #1a1a2e, #0f0f1a)`,
              border: `1px solid ${agent.color}44`,
            }}
          />
        </motion.div>

        {/* Name tag */}
        <motion.div
          className="mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div 
            className="inline-block px-3 py-1 rounded text-xs font-bold font-display"
            style={{
              background: `${agent.color}22`,
              border: `1px solid ${agent.color}`,
              color: agent.color,
              textShadow: `0 0 10px ${agent.color}`,
            }}
          >
            {agent.name}
          </div>
          <div className="text-[10px] mt-1 opacity-60" style={{ color: agent.color }}>
            {agent.role}
          </div>
        </motion.div>

        {/* Thought bubble - appears on hover */}
        <motion.div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ zIndex: 100 }}
        >
          <div 
            className="glass-card rounded-lg p-2 text-[10px] leading-tight"
            style={{ 
              borderColor: agent.color,
              boxShadow: `0 0 20px ${agent.color}44`
            }}
          >
            <p className="text-gray-300 italic">"{agent.thoughts[currentThought]}"</p>
          </div>
          {/* Thought bubble tail */}
          <div className="flex justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ background: agent.color + '66' }} />
            <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: agent.color + '44' }} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

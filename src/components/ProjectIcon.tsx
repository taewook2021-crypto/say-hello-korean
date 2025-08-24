import React from 'react';

interface ProjectIconProps {
  status: 'new' | 'growing' | 'mature' | 'completed';
  archiveCount: number;
  milestoneAchieved?: boolean;
  className?: string;
}

export const ProjectIcon: React.FC<ProjectIconProps> = ({ 
  status, 
  archiveCount, 
  milestoneAchieved = false,
  className = '' 
}) => {
  const getIcon = () => {
    switch (status) {
      case 'new':
        return '🌱';
      case 'growing':
        return archiveCount > 0 ? '🍃' : '🌿';
      case 'mature':
        return '🌳';
      case 'completed':
        return '🌸';
      default:
        return '🌱';
    }
  };

  const getAnimationClass = () => {
    switch (status) {
      case 'growing':
        return archiveCount > 0 ? 'animate-leaf-grow' : 'animate-branch-thicken';
      case 'mature':
        return milestoneAchieved ? 'animate-sparkle' : 'animate-branch-expand';
      case 'completed':
        return 'animate-bloom';
      default:
        return '';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={`text-2xl transition-all duration-300 ${getAnimationClass()}`}>
        {getIcon()}
      </span>
      {milestoneAchieved && status === 'mature' && (
        <span className="absolute -top-1 -right-1 text-lg animate-sparkle">✨</span>
      )}
    </div>
  );
};
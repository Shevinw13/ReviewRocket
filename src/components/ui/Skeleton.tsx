/**
 * Skeleton loading placeholder component.
 * Renders animated shimmer placeholders matching the layout of real content.
 * Used instead of spinners for a perceived-faster loading experience.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface SkeletonProps {
  /** Width — number (px) or string ('100%') */
  width?: number | string;
  /** Height in px */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Additional className */
  className?: string;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, className = '' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={className}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
        } as any,
        { opacity } as any,
      ] as any}
    />
  );
}

/** Skeleton for a dashboard metrics card */
export function DashboardSkeleton() {
  return (
    <View className="px-5 -mt-4">
      {/* Primary card skeleton */}
      <View className="bg-white rounded-2xl p-5 mb-4 border border-light-gray">
        <View className="flex-row mb-3 gap-2">
          <SkeletonBox width={40} height={28} borderRadius={8} />
          <SkeletonBox width={48} height={28} borderRadius={8} />
          <SkeletonBox width={52} height={28} borderRadius={8} />
        </View>
        <SkeletonBox width={120} height={12} className="mb-3" />
        <SkeletonBox width={80} height={40} borderRadius={4} className="mb-2" />
        <SkeletonBox width={160} height={12} />
      </View>

      {/* Three metric boxes */}
      <View className="flex-row gap-3">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-1 bg-white rounded-2xl p-4 border border-light-gray">
            <SkeletonBox width={32} height={32} borderRadius={16} className="mb-2" />
            <SkeletonBox width={40} height={24} className="mb-2" />
            <SkeletonBox width={60} height={12} />
          </View>
        ))}
      </View>

      {/* CTA button skeleton */}
      <SkeletonBox height={52} borderRadius={16} className="mt-6" />

      {/* Activity skeleton */}
      <View className="mt-8">
        <SkeletonBox width={120} height={16} className="mb-4" />
        <View className="bg-white rounded-2xl border border-light-gray p-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row items-center mb-3">
              <SkeletonBox width={36} height={36} borderRadius={18} />
              <View className="flex-1 ml-3">
                <SkeletonBox width={120} height={14} className="mb-1" />
                <SkeletonBox width={80} height={12} />
              </View>
              <SkeletonBox width={40} height={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Skeleton for inbox feedback cards */
export function InboxSkeleton() {
  return (
    <View className="px-5">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-2xl p-4 border border-light-gray mb-3">
          <View className="flex-row items-center mb-3">
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <View className="flex-1 ml-3">
              <SkeletonBox width={140} height={14} className="mb-1" />
              <SkeletonBox width={80} height={12} />
            </View>
          </View>
          <View className="ml-12">
            <SkeletonBox height={14} className="mb-1" />
            <SkeletonBox width="80%" height={14} className="mb-3" />
            <View className="flex-row gap-2">
              <SkeletonBox width={70} height={32} borderRadius={12} />
              <SkeletonBox width={60} height={32} borderRadius={12} />
              <SkeletonBox width={70} height={32} borderRadius={12} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export { SkeletonBox };

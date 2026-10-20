// src/admin/ApiReferencePage.jsx

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ShieldCheck,
  Globe,
  Package,
  FileText,
  Trophy,
  User,
  Truck,
  Bell,
  Heart,
  Star,
  Search,
  Server,
  ChevronDown,
  Lock,
  ArrowLeft,
  Layers,
  KeyRound,
  Code2,
} from 'lucide-react';

/* ============================================================
   DATA
============================================================ */

const API_GROUPS = [
  {
    name: 'Authentication',
    icon: ShieldCheck,
    description: 'User authentication and account management endpoints',
    endpoints: [
      {
        method: 'POST',
        path: '/auth/register',
        description: 'Register a new user with email verification',
        auth: 'public',
        body: {
          email: 'string (required)',
          password: 'string (required, min 6 chars)',
          fullName: 'string (required)',
          location: 'string (optional)',
          country: 'string (optional)',
          phone: 'string (optional)',
        },
        response: {
          success: true,
          message:
            'Registration successful! Please check your email to verify your account.',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            full_name: 'John Doe',
          },
          requiresEmailVerification: true,
        },
      },
      {
        method: 'POST',
        path: '/auth/login',
        description: 'Login with email and password',
        auth: 'public',
        body: {
          email: 'string (required)',
          password: 'string (required)',
        },
        response: {
          success: true,
          message: 'Login successful!',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            full_name: 'John Doe',
          },
          session: {
            access_token: 'eyJhbGciOiJIUzI1NiIs...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
            expires_at: '2024-01-01T00:00:00.000Z',
          },
        },
      },
      {
        method: 'GET',
        path: '/auth/verify-email',
        description: 'Verify email with token',
        auth: 'public',
        params: { token: 'string (required)' },
        response: {
          success: true,
          message: 'Email verified successfully! 🎉',
          user: {
            id: 'uuid',
            email: 'user@example.com',
            full_name: 'John Doe',
            verified: true,
          },
        },
      },
      {
        method: 'POST',
        path: '/auth/resend-verification',
        description: 'Resend verification email',
        auth: 'public',
        body: { email: 'string (required)' },
        response: {
          success: true,
          message: 'Verification email resent! Please check your inbox.',
        },
      },
      {
        method: 'GET',
        path: '/auth/check-user-exists',
        description: 'Check if a user exists by email',
        auth: 'public',
        params: { email: 'string (required)' },
        response: {
          success: true,
          exists: true,
          user: {
            email: 'user@example.com',
            verified: true,
            full_name: 'John Doe',
          },
        },
      },
      {
        method: 'GET',
        path: '/auth/me',
        description: 'Get current authenticated user',
        auth: 'authenticated',
        response: {
          success: true,
          user: {
            id: 'uuid',
            email: 'user@example.com',
            full_name: 'John Doe',
            location: 'Lagos, Nigeria',
            rating: 4.5,
            items_given: 10,
            items_received: 5,
          },
        },
      },
      {
        method: 'POST',
        path: '/auth/logout',
        description: 'Logout current user',
        auth: 'authenticated',
        response: {
          success: true,
          message: 'Logout successful!',
        },
      },
      {
        method: 'POST',
        path: '/auth/reset-password',
        description: 'Request password reset email',
        auth: 'public',
        body: { email: 'string (required)' },
        response: {
          success: true,
          message: 'Password reset email sent! Please check your inbox.',
        },
      },
      {
        method: 'POST',
        path: '/auth/update-password',
        description: 'Update password after reset',
        auth: 'public',
        body: {
          password: 'string (required, min 6 chars)',
          token: 'string (optional)',
        },
        response: {
          success: true,
          message:
            'Password updated successfully! Please login with your new password.',
        },
      },
      {
        method: 'POST',
        path: '/auth/change-password',
        description: 'Change password (while logged in)',
        auth: 'authenticated',
        body: {
          currentPassword: 'string (required)',
          newPassword: 'string (required, min 6 chars)',
        },
        response: {
          success: true,
          message: 'Password changed successfully!',
        },
      },
      {
        method: 'GET',
        path: '/auth/check-confirmation',
        description: 'Check if email is confirmed',
        auth: 'public',
        params: { email: 'string (required)' },
        response: {
          success: true,
          verified: true,
          email: 'user@example.com',
        },
      },
    ],
  },
  {
    name: 'Google OAuth',
    icon: KeyRound,
    description: 'Google authentication endpoints',
    endpoints: [
      {
        method: 'POST',
        path: '/auth/google',
        description: 'Sign in with Google ID token (Client-side flow)',
        auth: 'public',
        body: { token: 'string (required) - Google ID token' },
        response: {
          success: true,
          message: 'Google login successful!',
          user: {
            id: 'uuid',
            email: 'user@gmail.com',
            full_name: 'John Doe',
          },
          session: {
            access_token: 'eyJhbGciOiJIUzI1NiIs...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
            expires_at: '2024-01-01T00:00:00.000Z',
          },
          isNewUser: true,
        },
      },
      {
        method: 'GET',
        path: '/auth/google/url',
        description: 'Get Google OAuth URL (Server-side flow)',
        auth: 'public',
        response: {
          success: true,
          url: 'https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...',
        },
      },
      {
        method: 'GET',
        path: '/auth/google/callback',
        description: 'Google OAuth callback endpoint',
        auth: 'public',
        params: { code: 'string (required)' },
        response: 'Redirects to frontend with access_token and refresh_token',
      },
    ],
  },
  {
    name: 'Items',
    icon: Package,
    description: 'Item management endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/items',
        description: 'Get all items with optional filters',
        auth: 'public',
        params: {
          category: 'string (optional)',
          condition: 'string (optional)',
          status: 'string (optional) - active/pending/completed/cancelled',
          search: 'string (optional)',
          donor_pays_shipping: 'boolean (optional)',
          region: 'string (optional)',
          sort: 'string (optional) - newest/oldest/popular',
          limit: 'number (optional, default: 20)',
          offset: 'number (optional, default: 0)',
        },
        response: {
          success: true,
          items: [
            {
              id: 'uuid',
              title: 'iPhone 12 Pro Max',
              description: 'Great condition, barely used',
              category: 'Mobile Phones',
              condition: 'Good',
              images: ['https://example.com/image1.jpg'],
              donor: {
                id: 'uuid',
                full_name: 'John Doe',
              },
              status: 'active',
            },
          ],
          total: 100,
          limit: 20,
          offset: 0,
        },
      },
      {
        method: 'GET',
        path: '/items/:id',
        description: 'Get single item by ID',
        auth: 'public',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          item: {
            id: 'uuid',
            title: 'iPhone 12 Pro Max',
            description: 'Great condition, barely used',
            category: 'Mobile Phones',
            condition: 'Good',
            images: ['https://example.com/image1.jpg'],
            donor: {
              id: 'uuid',
              full_name: 'John Doe',
              location: 'Lagos, Nigeria',
            },
            applications: [],
            status: 'active',
          },
        },
      },
      {
        method: 'GET',
        path: '/items/donor/:donorId',
        description: 'Get items by donor ID',
        auth: 'public',
        params: { donorId: 'uuid (required)' },
        response: {
          success: true,
          items: [
            {
              id: 'uuid',
              title: 'iPhone 12 Pro Max',
              status: 'active',
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/items',
        description: 'Create a new item listing',
        auth: 'authenticated',
        body: {
          title: 'string (required)',
          description: 'string (required)',
          category: 'string (required)',
          condition: 'string (required) - New/Like New/Good/Fair/Poor',
          images: 'array of file URLs (multipart/form-data)',
          weight_kg: 'number (optional)',
          length_cm: 'number (optional)',
          width_cm: 'number (optional)',
          height_cm: 'number (optional)',
          donor_pays_shipping: 'boolean (optional)',
          shipping_regions: 'object (optional)',
        },
        response: {
          success: true,
          message: 'Item listed successfully!',
          item: {
            id: 'uuid',
            title: 'iPhone 12 Pro Max',
            status: 'active',
          },
        },
      },
      {
        method: 'PUT',
        path: '/items/:id',
        description: 'Update an existing item',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        body: {
          title: 'string (optional)',
          description: 'string (optional)',
          category: 'string (optional)',
          condition: 'string (optional)',
          images: 'array of file URLs (multipart/form-data)',
        },
        response: {
          success: true,
          message: 'Item updated successfully!',
          item: {
            id: 'uuid',
            title: 'iPhone 12 Pro Max',
            status: 'active',
          },
        },
      },
      {
        method: 'DELETE',
        path: '/items/:id',
        description: 'Delete an item',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          message: 'Item deleted successfully!',
        },
      },
    ],
  },
  {
    name: 'Applications',
    icon: FileText,
    description: 'Application management endpoints',
    endpoints: [
      {
        method: 'POST',
        path: '/applications',
        description: 'Apply for an item',
        auth: 'authenticated',
        body: {
          itemId: 'uuid (required)',
          message: 'string (required, min 10 chars)',
          shipping_estimate: 'number (optional)',
        },
        response: {
          success: true,
          message: 'Application submitted successfully!',
          application: {
            id: 'uuid',
            status: 'pending',
          },
        },
      },
      {
        method: 'GET',
        path: '/applications/my',
        description: "Get current user's applications",
        auth: 'authenticated',
        response: {
          success: true,
          applications: [
            {
              id: 'uuid',
              status: 'pending',
              item: {
                id: 'uuid',
                title: 'iPhone 12 Pro Max',
              },
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/applications/item/:itemId',
        description: 'Get applications for a specific item (donor view)',
        auth: 'authenticated',
        params: { itemId: 'uuid (required)' },
        response: {
          success: true,
          applications: [
            {
              id: 'uuid',
              applicant: {
                id: 'uuid',
                full_name: 'John Doe',
              },
              status: 'pending',
              message: 'I really need this item...',
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/applications/:id',
        description: 'Get application by ID',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          application: {
            id: 'uuid',
            status: 'pending',
          },
        },
      },
      {
        method: 'PUT',
        path: '/applications/:id/status',
        description: 'Update application status (accept/reject)',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        body: { status: 'string (required) - accepted/rejected' },
        response: {
          success: true,
          message: 'Application accepted successfully!',
          application: {
            id: 'uuid',
            status: 'accepted',
          },
        },
      },
      {
        method: 'PUT',
        path: '/applications/:id/cancel',
        description: 'Cancel a pending application',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          message: 'Application cancelled successfully!',
        },
      },
    ],
  },
  {
    name: 'Winners',
    icon: Trophy,
    description: 'Winner management endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/winners',
        description: 'Get all winners with pagination',
        auth: 'public',
        params: {
          limit: 'number (optional, default: 20)',
          offset: 'number (optional, default: 0)',
          week: 'date (optional)',
          month: 'number (optional)',
          year: 'number (optional)',
        },
        response: {
          success: true,
          winners: [
            {
              id: 'uuid',
              item: {
                id: 'uuid',
                title: 'iPhone 12 Pro Max',
              },
              winner: {
                id: 'uuid',
                full_name: 'John Doe',
              },
            },
          ],
          total: 100,
        },
      },
      {
        method: 'GET',
        path: '/winners/week',
        description: 'Get winner of the current week',
        auth: 'public',
        response: {
          success: true,
          winner: {
            id: 'uuid',
            item: {
              id: 'uuid',
              title: 'iPhone 12 Pro Max',
            },
            winner: {
              id: 'uuid',
              full_name: 'John Doe',
            },
          },
        },
      },
      {
        method: 'GET',
        path: '/winners/user/:userId',
        description: 'Get winners by user',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          winners: [
            {
              id: 'uuid',
              item: {
                id: 'uuid',
                title: 'iPhone 12 Pro Max',
              },
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/winners/date-range',
        description: 'Get winners by date range',
        auth: 'public',
        params: {
          startDate: 'date (required)',
          endDate: 'date (required)',
        },
        response: {
          success: true,
          winners: [],
        },
      },
    ],
  },
  {
    name: 'Users',
    icon: User,
    description: 'User management endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/users/:userId',
        description: 'Get user profile by ID',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          profile: {
            id: 'uuid',
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg',
            location: 'Lagos, Nigeria',
            rating: 4.5,
            items_given: 10,
            items_received: 5,
          },
        },
      },
      {
        method: 'PUT',
        path: '/users/profile',
        description: 'Update current user profile',
        auth: 'authenticated',
        body: {
          full_name: 'string (optional)',
          location: 'string (optional)',
          country: 'string (optional)',
          phone: 'string (optional)',
          bio: 'string (optional)',
          avatar_url: 'string (optional)',
        },
        response: {
          success: true,
          message: 'Profile updated successfully!',
          profile: {
            id: 'uuid',
            full_name: 'John Doe',
          },
        },
      },
      {
        method: 'GET',
        path: '/users/:userId/stats',
        description: 'Get user statistics',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          stats: {
            items_given: 10,
            items_received: 5,
            applications_submitted: 8,
            wins: 3,
          },
        },
      },
      {
        method: 'GET',
        path: '/users/:userId/items',
        description: 'Get items by user',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          items: [],
        },
      },
      {
        method: 'GET',
        path: '/users/:userId/applications',
        description: 'Get applications by user',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          applications: [],
        },
      },
      {
        method: 'GET',
        path: '/users/:userId/wins',
        description: 'Get wins by user',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          wins: [],
        },
      },
      {
        method: 'POST',
        path: '/users/avatar',
        description: 'Upload user avatar',
        auth: 'authenticated',
        body: 'multipart/form-data with image file',
        response: {
          success: true,
          message: 'Avatar uploaded successfully!',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      },
    ],
  },
  {
    name: 'Shipping',
    icon: Truck,
    description: 'Shipping and delivery endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/shipping/estimate',
        description: 'Get shipping estimate',
        auth: 'public',
        params: {
          from_country: 'string (required)',
          to_region: 'string (required)',
          weight_kg: 'number (required)',
          length_cm: 'number (optional)',
          width_cm: 'number (optional)',
          height_cm: 'number (optional)',
        },
        response: {
          success: true,
          estimates: [
            { carrier: 'DHL', price: 45.5, currency: 'USD', days: '3-5' },
            { carrier: 'FedEx', price: 52.3, currency: 'USD', days: '4-6' },
          ],
          cached: false,
        },
      },
      {
        method: 'GET',
        path: '/shipping/cheapest',
        description: 'Get cheapest shipping destinations',
        auth: 'public',
        params: {
          from_country: 'string (required)',
          weight_kg: 'number (required)',
          length_cm: 'number (optional)',
          width_cm: 'number (optional)',
          height_cm: 'number (optional)',
        },
        response: {
          success: true,
          destinations: [
            { region: 'West Africa', price: 18.5, currency: 'USD' },
            { region: 'North America', price: 22.3, currency: 'USD' },
          ],
        },
      },
      {
        method: 'GET',
        path: '/shipping/rates',
        description: 'Get shipping rates for specific region',
        auth: 'public',
        params: {
          from_country: 'string (required)',
          to_country: 'string (required)',
          weight_kg: 'number (required)',
        },
        response: {
          success: true,
          rates: [],
        },
      },
      {
        method: 'GET',
        path: '/shipping/tracking/:trackingNumber',
        description: 'Get tracking information',
        auth: 'public',
        params: { trackingNumber: 'string (required)' },
        response: {
          success: true,
          tracking: {
            status: 'In Transit',
            estimated_delivery: '2024-01-01',
          },
        },
      },
    ],
  },
  {
    name: 'Notifications',
    icon: Bell,
    description: 'Notification management endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/notifications',
        description: 'Get user notifications',
        auth: 'authenticated',
        params: {
          limit: 'number (optional, default: 20)',
          offset: 'number (optional, default: 0)',
          is_read: 'boolean (optional)',
        },
        response: {
          success: true,
          notifications: [
            {
              id: 'uuid',
              title: 'Application Accepted',
              message: 'Your application was accepted!',
              is_read: false,
              created_at: '2024-01-01T00:00:00.000Z',
            },
          ],
          total: 50,
        },
      },
      {
        method: 'PUT',
        path: '/notifications/:id/read',
        description: 'Mark notification as read',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          message: 'Notification marked as read',
        },
      },
      {
        method: 'PUT',
        path: '/notifications/read-all',
        description: 'Mark all notifications as read',
        auth: 'authenticated',
        response: {
          success: true,
          message: 'All notifications marked as read',
        },
      },
      {
        method: 'DELETE',
        path: '/notifications/:id',
        description: 'Delete a notification',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          message: 'Notification deleted',
        },
      },
      {
        method: 'GET',
        path: '/notifications/unread-count',
        description: 'Get unread notification count',
        auth: 'authenticated',
        response: {
          success: true,
          count: 5,
        },
      },
    ],
  },
  {
    name: 'Favorites',
    icon: Heart,
    description: 'Favorite items management',
    endpoints: [
      {
        method: 'GET',
        path: '/favorites',
        description: "Get user's favorite items",
        auth: 'authenticated',
        response: {
          success: true,
          favorites: [
            {
              id: 'uuid',
              item: {
                id: 'uuid',
                title: 'iPhone 12 Pro Max',
              },
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/favorites',
        description: 'Add item to favorites',
        auth: 'authenticated',
        body: { itemId: 'uuid (required)' },
        response: {
          success: true,
          message: 'Added to favorites',
        },
      },
      {
        method: 'DELETE',
        path: '/favorites/:itemId',
        description: 'Remove item from favorites',
        auth: 'authenticated',
        params: { itemId: 'uuid (required)' },
        response: {
          success: true,
          message: 'Removed from favorites',
        },
      },
      {
        method: 'GET',
        path: '/favorites/check/:itemId',
        description: 'Check if item is in favorites',
        auth: 'authenticated',
        params: { itemId: 'uuid (required)' },
        response: {
          success: true,
          isFavorite: true,
        },
      },
    ],
  },
  {
    name: 'Ratings',
    icon: Star,
    description: 'Ratings and reviews endpoints',
    endpoints: [
      {
        method: 'GET',
        path: '/ratings/user/:userId',
        description: 'Get all ratings for a user',
        auth: 'public',
        params: { userId: 'uuid (required)' },
        response: {
          success: true,
          ratings: [
            {
              id: 'uuid',
              rating: 5,
              review: 'Great person to deal with!',
              rater: {
                id: 'uuid',
                full_name: 'Jane Doe',
              },
            },
          ],
          average: 4.5,
        },
      },
      {
        method: 'GET',
        path: '/ratings/item/:itemId',
        description: 'Get all ratings for an item',
        auth: 'public',
        params: { itemId: 'uuid (required)' },
        response: {
          success: true,
          ratings: [],
        },
      },
      {
        method: 'POST',
        path: '/ratings',
        description: 'Create a rating',
        auth: 'authenticated',
        body: {
          itemId: 'uuid (required)',
          ratedUserId: 'uuid (required)',
          rating: 'number (required, 1-5)',
          review: 'string (optional)',
        },
        response: {
          success: true,
          rating: {
            id: 'uuid',
            rating: 5,
            review: 'Great experience!',
          },
        },
      },
      {
        method: 'PUT',
        path: '/ratings/:id',
        description: 'Update a rating',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        body: {
          rating: 'number (optional, 1-5)',
          review: 'string (optional)',
        },
        response: {
          success: true,
          rating: {
            id: 'uuid',
            rating: 5,
            review: 'Updated review',
          },
        },
      },
      {
        method: 'DELETE',
        path: '/ratings/:id',
        description: 'Delete a rating',
        auth: 'authenticated',
        params: { id: 'uuid (required)' },
        response: {
          success: true,
          message: 'Rating deleted',
        },
      },
    ],
  },
];

/* ============================================================
   HELPERS
============================================================ */

const API_BASE_URL =
  import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

const getMethodClasses = (method) => {
  const map = {
    GET: 'border-primary-200 bg-primary-50 text-primary-700',
    POST: 'border-success-200 bg-success-50 text-success-700',
    PUT: 'border-warning-200 bg-warning-50 text-warning-700',
    DELETE: 'border-danger-200 bg-danger-50 text-danger-700',
  };
  return map[method] || 'border-ink-200 bg-ink-50 text-ink-700';
};

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({ label, value, icon: Icon, tone = 'ink' }) {
  const tones = {
    ink: { color: 'text-ink-900', bg: 'bg-ink-50' },
    primary: { color: 'text-primary-600', bg: 'bg-primary-50' },
    success: { color: 'text-success-600', bg: 'bg-success-50' },
    warning: { color: 'text-warning-600', bg: 'bg-warning-50' },
    danger: { color: 'text-danger-600', bg: 'bg-danger-50' },
  };

  const style = tones[tone] || tones.ink;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold text-ink-500">{label}</p>

        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
        >
          <Icon size={15} className={style.color} />
        </span>
      </div>

      <p className={`mt-2 text-2xl font-black tracking-tight ${style.color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/* ============================================================
   AUTH BADGE
============================================================ */

function AuthBadge({ auth }) {
  if (auth === 'authenticated') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[10px] font-extrabold text-primary-700">
        <Lock size={9} />
        Auth Required
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-0.5 text-[10px] font-extrabold text-ink-600">
      <Globe size={9} />
      Public
    </span>
  );
}

/* ============================================================
   PARAM GRID
============================================================ */

function ParamGrid({ entries }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start gap-1.5">
          <span className="shrink-0 font-mono text-[11px] font-extrabold text-ink-700">
            {key}:
          </span>

          <span className="font-mono text-[11px] font-bold text-ink-500">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   ENDPOINT CARD
============================================================ */

function EndpointItem({ endpoint }) {
  const hasObjectBody =
    endpoint.body &&
    typeof endpoint.body === 'object' &&
    !Array.isArray(endpoint.body);

  const hasStringBody =
    endpoint.body && typeof endpoint.body === 'string';

  return (
    <div className="border-b border-ink-100 px-5 py-4 last:border-b-0">
      {/* Method + path + auth */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg border px-2 py-0.5 text-[10px] font-extrabold ${getMethodClasses(
            endpoint.method
          )}`}
        >
          {endpoint.method}
        </span>

        <code className="max-w-full truncate rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1 font-mono text-xs font-bold text-ink-800">
          {endpoint.path}
        </code>

        <AuthBadge auth={endpoint.auth} />
      </div>

      <p className="mt-2 text-xs font-bold leading-5 text-ink-500">
        {endpoint.description}
      </p>

      {/* Object body */}
      {hasObjectBody && (
        <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Request Body
          </p>

          <ParamGrid entries={Object.entries(endpoint.body)} />
        </div>
      )}

      {/* String body */}
      {hasStringBody && (
        <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Request Body
          </p>

          <span className="font-mono text-[11px] font-bold text-ink-700">
            {endpoint.body}
          </span>
        </div>
      )}

      {/* Query params */}
      {endpoint.params && (
        <div className="mt-3 rounded-2xl border border-ink-100 bg-ink-50/50 p-3">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
            Query Parameters
          </p>

          <ParamGrid entries={Object.entries(endpoint.params)} />
        </div>
      )}

      {/* Response */}
      <div className="mt-3 rounded-2xl bg-ink-950 p-3">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
          Response Example
        </p>

        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-primary-300">
          {typeof endpoint.response === 'string'
            ? endpoint.response
            : JSON.stringify(endpoint.response, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ============================================================
   API GROUP
============================================================ */

function ApiGroup({ group, expanded, onToggle }) {
  const Icon = group.icon;

  return (
    <div className="overflow-hidden rounded-[26px] border border-ink-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/60 px-5 py-4 text-left transition hover:bg-ink-50"
        aria-expanded={expanded}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Icon size={15} />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold text-ink-950">
              {group.name}
            </h2>

            <p className="truncate text-[11px] font-bold text-ink-400">
              {group.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-ink-200 bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-ink-600">
            {group.endpoints.length}
          </span>

          <ChevronDown
            size={16}
            className={`text-ink-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div>
              {group.endpoints.map((endpoint, index) => (
                <EndpointItem
                  key={`${endpoint.method}-${endpoint.path}-${index}`}
                  endpoint={endpoint}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

const ApiReferencePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState(
    API_GROUPS[0]?.name || null
  );

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  /* ============================================================
     STATS
  ============================================================ */

  const totalEndpoints = useMemo(
    () =>
      API_GROUPS.reduce((acc, g) => acc + g.endpoints.length, 0),
    []
  );

  const publicCount = useMemo(
    () =>
      API_GROUPS.reduce(
        (acc, g) => acc + g.endpoints.filter((e) => e.auth === 'public').length,
        0
      ),
    []
  );

  const authCount = totalEndpoints - publicCount;

  /* ============================================================
     SEARCH FILTER
  ============================================================ */

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return API_GROUPS.map((group) => ({
      ...group,
      endpoints: group.endpoints.filter(
        (endpoint) =>
          endpoint.path.toLowerCase().includes(term) ||
          endpoint.description.toLowerCase().includes(term) ||
          group.name.toLowerCase().includes(term)
      ),
    })).filter((group) => group.endpoints.length > 0);
  }, [searchTerm]);

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-full bg-transparent">
      <div className="mx-auto w-full max-w-[1500px] space-y-7">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <BookOpen size={14} />
                <span>API Reference · v1.0</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Complete API Reference
              </h1>

              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6 text-ink-500">
                <span>{totalEndpoints} endpoints</span>
                <span className="text-ink-300">·</span>
                <span>All available endpoints for the Don't Trash It platform</span>
              </p>
            </div>

            <Link
              to="/admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              <ArrowLeft size={15} />
              Back to Dashboard
            </Link>
          </div>
        </header>

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Endpoints"
            value={totalEndpoints}
            icon={Layers}
            tone="ink"
          />

          <StatCard
            label="Public"
            value={publicCount}
            icon={Globe}
            tone="success"
          />

          <StatCard
            label="Auth Required"
            value={authCount}
            icon={Lock}
            tone="primary"
          />

          <StatCard
            label="Categories"
            value={API_GROUPS.length}
            icon={Code2}
            tone="warning"
          />
        </section>

        {/* =====================================================
            BASE URL + SEARCH
        ===================================================== */}

        <section className="rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-ink-50 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Server size={14} />
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Base URL
                </p>

                <code className="truncate font-mono text-xs font-bold text-ink-800">
                  {API_BASE_URL}
                </code>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-ink-50 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-600">
                <ShieldCheck size={14} />
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Authentication
                </p>

                <p className="truncate text-xs font-bold text-ink-800">
                  Bearer token required for protected endpoints
                </p>
              </div>
            </div>

            <div className="relative w-full lg:w-80 lg:shrink-0">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              />

              <input
                type="text"
                placeholder="Search endpoints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm font-medium text-ink-900 outline-none transition placeholder:font-medium placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            API GROUPS
        ===================================================== */}

        {filteredGroups.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-[26px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600">
                <Search size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                No endpoints found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                Try a different search term to find the endpoint you need.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <ApiGroup
                key={group.name}
                group={group}
                expanded={expandedSection === group.name}
                onToggle={() => toggleSection(group.name)}
              />
            ))}
          </div>
        )}

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="rounded-2xl border border-ink-100 bg-white px-5 py-4 text-center shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">
            Don't Trash It API · v1.0
          </p>

          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-bold text-ink-500">
            <span>Base URL:</span>

            <code className="rounded-lg border border-ink-100 bg-ink-50 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-700">
              {API_BASE_URL}
            </code>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ApiReferencePage;
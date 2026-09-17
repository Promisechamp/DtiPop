import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ApiReferencePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const apiGroups = [
    {
      name: 'Authentication',
      icon: 'bi bi-shield-lock',
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
            phone: 'string (optional)'
          },
          response: {
            success: true,
            message: 'Registration successful! Please check your email to verify your account.',
            user: {
              id: 'uuid',
              email: 'user@example.com',
              full_name: 'John Doe'
            },
            requiresEmailVerification: true
          }
        },
        {
          method: 'POST',
          path: '/auth/login',
          description: 'Login with email and password',
          auth: 'public',
          body: {
            email: 'string (required)',
            password: 'string (required)'
          },
          response: {
            success: true,
            message: 'Login successful!',
            user: {
              id: 'uuid',
              email: 'user@example.com',
              full_name: 'John Doe'
            },
            session: {
              access_token: 'eyJhbGciOiJIUzI1NiIs...',
              refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
              expires_at: '2024-01-01T00:00:00.000Z'
            }
          }
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
              verified: true
            }
          }
        },
        {
          method: 'POST',
          path: '/auth/resend-verification',
          description: 'Resend verification email',
          auth: 'public',
          body: { email: 'string (required)' },
          response: {
            success: true,
            message: 'Verification email resent! Please check your inbox.'
          }
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
              full_name: 'John Doe'
            }
          }
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
              items_received: 5
            }
          }
        },
        {
          method: 'POST',
          path: '/auth/logout',
          description: 'Logout current user',
          auth: 'authenticated',
          response: {
            success: true,
            message: 'Logout successful!'
          }
        },
        {
          method: 'POST',
          path: '/auth/reset-password',
          description: 'Request password reset email',
          auth: 'public',
          body: { email: 'string (required)' },
          response: {
            success: true,
            message: 'Password reset email sent! Please check your inbox.'
          }
        },
        {
          method: 'POST',
          path: '/auth/update-password',
          description: 'Update password after reset',
          auth: 'public',
          body: {
            password: 'string (required, min 6 chars)',
            token: 'string (optional)'
          },
          response: {
            success: true,
            message: 'Password updated successfully! Please login with your new password.'
          }
        },
        {
          method: 'POST',
          path: '/auth/change-password',
          description: 'Change password (while logged in)',
          auth: 'authenticated',
          body: {
            currentPassword: 'string (required)',
            newPassword: 'string (required, min 6 chars)'
          },
          response: {
            success: true,
            message: 'Password changed successfully!'
          }
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
            email: 'user@example.com'
          }
        }
      ]
    },
    {
      name: 'Google OAuth',
      icon: 'bi bi-google',
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
              full_name: 'John Doe'
            },
            session: {
              access_token: 'eyJhbGciOiJIUzI1NiIs...',
              refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
              expires_at: '2024-01-01T00:00:00.000Z'
            },
            isNewUser: true
          }
        },
        {
          method: 'GET',
          path: '/auth/google/url',
          description: 'Get Google OAuth URL (Server-side flow)',
          auth: 'public',
          response: {
            success: true,
            url: 'https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...'
          }
        },
        {
          method: 'GET',
          path: '/auth/google/callback',
          description: 'Google OAuth callback endpoint',
          auth: 'public',
          params: { code: 'string (required)' },
          response: 'Redirects to frontend with access_token and refresh_token'
        }
      ]
    },
    {
      name: 'Items',
      icon: 'bi bi-box',
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
            offset: 'number (optional, default: 0)'
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
                  full_name: 'John Doe'
                },
                status: 'active'
              }
            ],
            total: 100,
            limit: 20,
            offset: 0
          }
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
                location: 'Lagos, Nigeria'
              },
              applications: [],
              status: 'active'
            }
          }
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
                status: 'active'
              }
            ]
          }
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
            shipping_regions: 'object (optional)'
          },
          response: {
            success: true,
            message: 'Item listed successfully!',
            item: {
              id: 'uuid',
              title: 'iPhone 12 Pro Max',
              status: 'active'
            }
          }
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
            images: 'array of file URLs (multipart/form-data)'
          },
          response: {
            success: true,
            message: 'Item updated successfully!',
            item: {
              id: 'uuid',
              title: 'iPhone 12 Pro Max',
              status: 'active'
            }
          }
        },
        {
          method: 'DELETE',
          path: '/items/:id',
          description: 'Delete an item',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          response: {
            success: true,
            message: 'Item deleted successfully!'
          }
        }
      ]
    },
    {
      name: 'Applications',
      icon: 'bi bi-file-earmark-text',
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
            shipping_estimate: 'number (optional)'
          },
          response: {
            success: true,
            message: 'Application submitted successfully!',
            application: {
              id: 'uuid',
              status: 'pending'
            }
          }
        },
        {
          method: 'GET',
          path: '/applications/my',
          description: 'Get current user\'s applications',
          auth: 'authenticated',
          response: {
            success: true,
            applications: [
              {
                id: 'uuid',
                status: 'pending',
                item: {
                  id: 'uuid',
                  title: 'iPhone 12 Pro Max'
                }
              }
            ]
          }
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
                  full_name: 'John Doe'
                },
                status: 'pending',
                message: 'I really need this item...'
              }
            ]
          }
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
              status: 'pending'
            }
          }
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
              status: 'accepted'
            }
          }
        },
        {
          method: 'PUT',
          path: '/applications/:id/cancel',
          description: 'Cancel a pending application',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          response: {
            success: true,
            message: 'Application cancelled successfully!'
          }
        }
      ]
    },
    {
      name: 'Winners',
      icon: 'bi bi-trophy',
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
            year: 'number (optional)'
          },
          response: {
            success: true,
            winners: [
              {
                id: 'uuid',
                item: {
                  id: 'uuid',
                  title: 'iPhone 12 Pro Max'
                },
                winner: {
                  id: 'uuid',
                  full_name: 'John Doe'
                }
              }
            ],
            total: 100
          }
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
                title: 'iPhone 12 Pro Max'
              },
              winner: {
                id: 'uuid',
                full_name: 'John Doe'
              }
            }
          }
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
                  title: 'iPhone 12 Pro Max'
                }
              }
            ]
          }
        },
        {
          method: 'GET',
          path: '/winners/date-range',
          description: 'Get winners by date range',
          auth: 'public',
          params: {
            startDate: 'date (required)',
            endDate: 'date (required)'
          },
          response: {
            success: true,
            winners: []
          }
        }
      ]
    },
    {
      name: 'Users',
      icon: 'bi bi-person',
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
              items_received: 5
            }
          }
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
            avatar_url: 'string (optional)'
          },
          response: {
            success: true,
            message: 'Profile updated successfully!',
            profile: {
              id: 'uuid',
              full_name: 'John Doe'
            }
          }
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
              wins: 3
            }
          }
        },
        {
          method: 'GET',
          path: '/users/:userId/items',
          description: 'Get items by user',
          auth: 'public',
          params: { userId: 'uuid (required)' },
          response: {
            success: true,
            items: []
          }
        },
        {
          method: 'GET',
          path: '/users/:userId/applications',
          description: 'Get applications by user',
          auth: 'public',
          params: { userId: 'uuid (required)' },
          response: {
            success: true,
            applications: []
          }
        },
        {
          method: 'GET',
          path: '/users/:userId/wins',
          description: 'Get wins by user',
          auth: 'public',
          params: { userId: 'uuid (required)' },
          response: {
            success: true,
            wins: []
          }
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
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      ]
    },
    {
      name: 'Shipping',
      icon: 'bi bi-truck',
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
            height_cm: 'number (optional)'
          },
          response: {
            success: true,
            estimates: [
              { carrier: 'DHL', price: 45.50, currency: 'USD', days: '3-5' },
              { carrier: 'FedEx', price: 52.30, currency: 'USD', days: '4-6' }
            ],
            cached: false
          }
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
            height_cm: 'number (optional)'
          },
          response: {
            success: true,
            destinations: [
              { region: 'West Africa', price: 18.50, currency: 'USD' },
              { region: 'North America', price: 22.30, currency: 'USD' }
            ]
          }
        },
        {
          method: 'GET',
          path: '/shipping/rates',
          description: 'Get shipping rates for specific region',
          auth: 'public',
          params: {
            from_country: 'string (required)',
            to_country: 'string (required)',
            weight_kg: 'number (required)'
          },
          response: {
            success: true,
            rates: []
          }
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
              estimated_delivery: '2024-01-01'
            }
          }
        }
      ]
    },
    {
      name: 'Notifications',
      icon: 'bi bi-bell',
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
            is_read: 'boolean (optional)'
          },
          response: {
            success: true,
            notifications: [
              {
                id: 'uuid',
                title: 'Application Accepted',
                message: 'Your application was accepted!',
                is_read: false,
                created_at: '2024-01-01T00:00:00.000Z'
              }
            ],
            total: 50
          }
        },
        {
          method: 'PUT',
          path: '/notifications/:id/read',
          description: 'Mark notification as read',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          response: {
            success: true,
            message: 'Notification marked as read'
          }
        },
        {
          method: 'PUT',
          path: '/notifications/read-all',
          description: 'Mark all notifications as read',
          auth: 'authenticated',
          response: {
            success: true,
            message: 'All notifications marked as read'
          }
        },
        {
          method: 'DELETE',
          path: '/notifications/:id',
          description: 'Delete a notification',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          response: {
            success: true,
            message: 'Notification deleted'
          }
        },
        {
          method: 'GET',
          path: '/notifications/unread-count',
          description: 'Get unread notification count',
          auth: 'authenticated',
          response: {
            success: true,
            count: 5
          }
        }
      ]
    },
    {
      name: 'Favorites',
      icon: 'bi bi-heart',
      description: 'Favorite items management',
      endpoints: [
        {
          method: 'GET',
          path: '/favorites',
          description: 'Get user\'s favorite items',
          auth: 'authenticated',
          response: {
            success: true,
            favorites: [
              {
                id: 'uuid',
                item: {
                  id: 'uuid',
                  title: 'iPhone 12 Pro Max'
                }
              }
            ]
          }
        },
        {
          method: 'POST',
          path: '/favorites',
          description: 'Add item to favorites',
          auth: 'authenticated',
          body: { itemId: 'uuid (required)' },
          response: {
            success: true,
            message: 'Added to favorites'
          }
        },
        {
          method: 'DELETE',
          path: '/favorites/:itemId',
          description: 'Remove item from favorites',
          auth: 'authenticated',
          params: { itemId: 'uuid (required)' },
          response: {
            success: true,
            message: 'Removed from favorites'
          }
        },
        {
          method: 'GET',
          path: '/favorites/check/:itemId',
          description: 'Check if item is in favorites',
          auth: 'authenticated',
          params: { itemId: 'uuid (required)' },
          response: {
            success: true,
            isFavorite: true
          }
        }
      ]
    },
    {
      name: 'Ratings',
      icon: 'bi bi-star',
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
                  full_name: 'Jane Doe'
                }
              }
            ],
            average: 4.5
          }
        },
        {
          method: 'GET',
          path: '/ratings/item/:itemId',
          description: 'Get all ratings for an item',
          auth: 'public',
          params: { itemId: 'uuid (required)' },
          response: {
            success: true,
            ratings: []
          }
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
            review: 'string (optional)'
          },
          response: {
            success: true,
            rating: {
              id: 'uuid',
              rating: 5,
              review: 'Great experience!'
            }
          }
        },
        {
          method: 'PUT',
          path: '/ratings/:id',
          description: 'Update a rating',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          body: {
            rating: 'number (optional, 1-5)',
            review: 'string (optional)'
          },
          response: {
            success: true,
            rating: {
              id: 'uuid',
              rating: 5,
              review: 'Updated review'
            }
          }
        },
        {
          method: 'DELETE',
          path: '/ratings/:id',
          description: 'Delete a rating',
          auth: 'authenticated',
          params: { id: 'uuid (required)' },
          response: {
            success: true,
            message: 'Rating deleted'
          }
        }
      ]
    }
  ];

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'bg-sky-100 text-sky-700 border-sky-200',
      'POST': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'PUT': 'bg-amber-100 text-amber-700 border-amber-200',
      'DELETE': 'bg-rose-100 text-rose-700 border-rose-200'
    };
    return colors[method] || 'bg-ink-100 text-ink-700 border-ink-200';
  };

  const getAuthBadge = (auth) => {
    if (auth === 'authenticated') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-primary-50 text-primary-700 border-primary-200">🔒 Auth Required</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-ink-50 text-ink-600 border-ink-200">🌐 Public</span>;
  };

  const filteredGroups = apiGroups
    .map(group => ({
      ...group,
      endpoints: group.endpoints.filter(endpoint =>
        endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(group => group.endpoints.length > 0);

  return (
    <div className="w-full">
      {/* Header (Unified) */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-primary-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary-600">
            API Reference v1.0
          </span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl">
          Complete API Reference
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          All available endpoints for the Don't Trash It platform
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mb-8">
        <div className="relative">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"></i>
          <input
            type="text"
            placeholder="Search endpoints by path or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none text-sm text-ink-900 placeholder:text-ink-400 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4 text-center">
          <p className="text-2xl font-extrabold text-ink-900">
            {apiGroups.reduce((acc, g) => acc + g.endpoints.length, 0)}
          </p>
          <p className="text-sm font-bold text-ink-500">Total Endpoints</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4 text-center">
          <p className="text-2xl font-extrabold text-primary-600">
            {apiGroups.reduce((acc, g) => acc + g.endpoints.filter(e => e.auth === 'public').length, 0)}
          </p>
          <p className="text-sm font-bold text-ink-500">Public Endpoints</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4 text-center">
          <p className="text-2xl font-extrabold text-sky-600">
            {apiGroups.reduce((acc, g) => acc + g.endpoints.filter(e => e.auth === 'authenticated').length, 0)}
          </p>
          <p className="text-sm font-bold text-ink-500">Auth Required</p>
        </div>
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-600">{apiGroups.length}</p>
          <p className="text-sm font-bold text-ink-500">Categories</p>
        </div>
      </div>

      {/* Base URL */}
      <div className="bg-ink-900 text-white rounded-2xl p-4 mb-8 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <i className="bi bi-server text-xl text-ink-400"></i>
          <span className="text-sm font-bold text-ink-400">Base URL:</span>
          <code className="bg-ink-800 px-3 py-1 rounded-lg text-sm font-mono text-ink-200">
            {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}
          </code>
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-ink-400">
          <i className="bi bi-shield-check text-emerald-400"></i>
          <span>All requests require <code className="bg-ink-800 px-2 py-0.5 rounded text-xs text-ink-300">Authorization: Bearer &lt;token&gt;</code> for protected endpoints</span>
        </div>
      </div>

      {/* API Groups */}
      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div key={group.name} className="bg-white rounded-2xl border border-ink-100/80 shadow-sm overflow-hidden">
            {/* Group Header */}
            <div 
              className="px-6 py-4 bg-ink-50/50 border-b border-ink-100 flex items-center justify-between cursor-pointer hover:bg-ink-50/70 transition"
              onClick={() => toggleSection(group.name)}
            >
              <div className="flex items-center gap-3">
                <i className={`${group.icon} text-xl text-primary-600`}></i>
                <div>
                  <h2 className="text-lg font-extrabold text-ink-900">{group.name}</h2>
                  <p className="text-sm font-medium text-ink-500">{group.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-ink-400">{group.endpoints.length} endpoints</span>
                <i className={`bi bi-chevron-${expandedSection === group.name ? 'up' : 'down'} text-ink-400`}></i>
              </div>
            </div>

            {/* Endpoints */}
            {expandedSection === group.name && (
              <div className="divide-y divide-ink-50">
                {group.endpoints.map((endpoint, index) => (
                  <div key={index} className="p-6 hover:bg-primary-50/20 transition">
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold border ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-ink-800 bg-ink-50 px-3 py-1 rounded-lg break-all border border-ink-100">
                        {endpoint.path}
                      </code>
                      {getAuthBadge(endpoint.auth)}
                    </div>
                    
                    <p className="text-ink-600 text-sm font-medium mb-3">{endpoint.description}</p>

                    {/* Request Body */}
                    {endpoint.body && typeof endpoint.body === 'object' && !Array.isArray(endpoint.body) && (
                      <div className="bg-ink-50/50 rounded-xl p-4 mb-3 border border-ink-100/60">
                        <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider mb-2">📤 Request Body:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                          {Object.entries(endpoint.body).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="font-mono text-xs font-bold text-ink-700">{key}:</span>
                              <span className="font-mono text-xs text-ink-500">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* String body (multipart/form-data) */}
                    {endpoint.body && typeof endpoint.body === 'string' && (
                      <div className="bg-ink-50/50 rounded-xl p-4 mb-3 border border-ink-100/60">
                        <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider mb-2">📤 Request Body:</p>
                        <span className="font-mono text-xs text-ink-700">{endpoint.body}</span>
                      </div>
                    )}

                    {/* Query Params */}
                    {endpoint.params && (
                      <div className="bg-ink-50/50 rounded-xl p-4 mb-3 border border-ink-100/60">
                        <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-wider mb-2">📋 Query Parameters:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                          {Object.entries(endpoint.params).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="font-mono text-xs font-bold text-ink-700">{key}:</span>
                              <span className="font-mono text-xs text-ink-500">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response Example */}
                    <div className="bg-ink-900 rounded-xl p-4 border border-ink-800">
                      <p className="text-[10px] font-extrabold text-ink-400 uppercase tracking-wider mb-2">📥 Response Example:</p>
                      <pre className="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                        {typeof endpoint.response === 'string' 
                          ? endpoint.response 
                          : JSON.stringify(endpoint.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm font-medium text-ink-500 border-t border-ink-100 pt-8">
        <p>Don't Trash It API v1.0</p>
        <p className="mt-1">
          Base URL: <code className="bg-ink-50 px-2 py-0.5 rounded text-xs text-ink-700 border border-ink-100">{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</code>
        </p>
        <p className="mt-4">
          <Link to="/admin" className="text-primary-600 hover:text-primary-700 font-bold transition">
            <i className="bi bi-arrow-left mr-1"></i>
            Back to Dashboard
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ApiReferencePage;
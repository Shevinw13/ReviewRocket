/**
 * Mock service implementations for local development without external services.
 * Returns realistic test data so the UI can be explored without Supabase, Twilio, etc.
 */

import type { ServiceRegistry } from '@/services';
import type { IAuthService } from '@/services/interfaces/auth.service';
import type {
  IReviewRequestRepository,
  IFeedbackRepository,
  IBusinessProfileRepository,
} from '@/services/interfaces/database.service';
import type { ISmsService } from '@/services/interfaces/sms.service';
import type { INotificationService } from '@/services/interfaces/notification.service';
import type { IMonitoringService } from '@/services/interfaces/monitoring.service';
import type { IAnalyticsService } from '@/services/interfaces/analytics.service';
import type { IInboxItemRepository } from '@/services/interfaces/inbox-item.service';
import type { IPlacesSearchService } from '@/services/interfaces/places-search.service';
import type {
  Result,
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  Unsubscribe,
  ReviewRequest,
  FeedbackRecord,
  BusinessProfile,
  BusinessType,
  SubscriptionTier,
  CreateReviewRequestDTO,
  SendSmsParams,
  SmsDeliveryResult,
  CreateFeedbackDTO,
  NotificationPermissionStatus,
  AppNotification,
  InboxItem,
  ActivityItem,
} from '@/types';
import { TIER_QUOTAS, ErrorCode } from '@/types';

// ─── Fake Data ───────────────────────────────────────────────────────────────

const FAKE_USER_ID = 'test-user-123';
const FAKE_BUSINESS_ID = 'biz-001';
const FAKE_EMAIL = 'shevinweinstein1@gmail.com';

const FAKE_SESSION: AuthSession = {
  user: {
    id: FAKE_USER_ID,
    email: FAKE_EMAIL,
    emailVerified: true,
  },
  accessToken: 'mock-access-token-xyz',
  refreshToken: 'mock-refresh-token-xyz',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

const FAKE_BUSINESS_PROFILE: BusinessProfile = {
  id: FAKE_BUSINESS_ID,
  authUserId: FAKE_USER_ID,
  firstName: 'Alex',
  lastName: 'Mitchell',
  businessName: 'Mitchell Plumbing Co.',
  businessType: 'trades',
  email: FAKE_EMAIL,
  googleReviewUrl: 'https://google.com/maps/place/mitchell-plumbing',
  subscriptionTier: 'growth',
  isTrialActive: false,
  smsUsedThisPeriod: 47,
  billingPeriodStart: new Date('2024-01-01'),
  messagingEnabled: true,
  twilioPhoneNumber: '(770) 555-0142',
  twilioRegistrationStatus: 'approved',
  businessPhone: '(404) 555-1234',
  businessAddress: '123 Main St',
  businessCity: 'Atlanta',
  businessState: 'GA',
  businessZip: '30301',
  createdAt: new Date('2023-06-15'),
  updatedAt: new Date('2024-01-10'),
};

function generateFakeActivityFeed(): ActivityItem[] {
  return [
    {
      id: 'act-001',
      type: 'rating',
      customerName: 'James Mitchell',
      rating: 5,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      id: 'act-002',
      type: 'rating',
      customerName: 'Rachel Kim',
      rating: 5,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      id: 'act-003',
      type: 'rating',
      customerName: 'David Chen',
      rating: 4,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      id: 'act-004',
      type: 'rating',
      customerName: 'Sarah Williams',
      rating: 5,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    },
    {
      id: 'act-005',
      type: 'rating',
      customerName: 'Tom Henderson',
      rating: 2,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20 hours ago
    },
    {
      id: 'act-006',
      type: 'rating',
      customerName: 'Laura Martinez',
      rating: 5,
      createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000), // 28 hours ago
    },
    {
      id: 'act-007',
      type: 'rating',
      customerName: 'Nicole Foster',
      rating: 4,
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
    },
    {
      id: 'act-008',
      type: 'rating',
      customerName: 'Chris Taylor',
      rating: 5,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: 'act-009',
      type: 'rating',
      customerName: 'Brian O\'Connor',
      rating: 3,
      createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 3 days ago
    },
    {
      id: 'act-010',
      type: 'rating',
      customerName: 'Jessica Park',
      rating: 5,
      createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000), // 4 days ago
    },
    {
      id: 'act-011',
      type: 'rating',
      customerName: 'Andrew Walsh',
      rating: 4,
      createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // ~4 days ago
    },
  ];
}

function generateFakeReviewRequests(): ReviewRequest[] {
  const customers = [
    { name: 'James Mitchell', rating: 5, status: 'rating_received' as const, service: 'HVAC Repair' },
    { name: 'Rachel Kim', rating: 5, status: 'rating_received' as const, service: 'AC Installation' },
    { name: 'David Chen', rating: 4, status: 'rating_received' as const, service: 'Duct Cleaning' },
    { name: 'Sarah Williams', rating: 5, status: 'rating_received' as const, service: 'Furnace Tune-up' },
    { name: 'Tom Henderson', rating: 2, status: 'feedback_received' as const, service: 'Water Heater Repair' },
    { name: 'Laura Martinez', rating: 5, status: 'rating_received' as const, service: 'AC Repair' },
    { name: 'Nicole Foster', rating: 4, status: 'rating_received' as const, service: 'Thermostat Install' },
    { name: 'Brian O\'Connor', rating: 3, status: 'feedback_received' as const, service: 'Plumbing Fix' },
    { name: 'Jessica Park', rating: 5, status: 'rating_received' as const, service: 'HVAC Maintenance' },
    { name: 'Andrew Walsh', rating: 5, status: 'rating_received' as const, service: 'Drain Cleaning' },
    { name: 'Maria Torres', rating: 4, status: 'rating_received' as const, service: 'AC Service' },
    { name: 'Kevin Brooks', rating: 1, status: 'feedback_received' as const, service: 'Emergency Repair' },
    { name: 'Stephanie Lee', rating: 5, status: 'rating_received' as const, service: 'Furnace Install' },
    { name: 'Mike Patterson', rating: undefined as any, status: 'google_link_sent' as const, service: 'Kitchen Remodel' },
    { name: 'Daniel Harris', rating: 5, status: 'rating_received' as const, service: 'Water Heater Install' },
    { name: 'Patricia Young', rating: 4, status: 'rating_received' as const, service: 'HVAC Repair' },
    { name: 'Tyler Ross', rating: 2, status: 'feedback_received' as const, service: 'Pipe Repair' },
    { name: 'Megan Clark', rating: 5, status: 'rating_received' as const, service: 'AC Tune-up' },
    { name: 'Ryan Cooper', rating: 5, status: 'rating_received' as const, service: 'Duct Install' },
    { name: 'Hannah Wright', rating: 4, status: 'rating_received' as const, service: 'Thermostat Repair' },
    { name: 'Jason Miller', rating: 5, status: 'rating_received' as const, service: 'HVAC Install' },
    { name: 'Ashley Green', rating: 3, status: 'feedback_received' as const, service: 'Plumbing Service' },
    { name: 'Brandon Lewis', rating: 5, status: 'rating_received' as const, service: 'Water Heater Service' },
    { name: 'Olivia Scott', rating: 5, status: 'rating_received' as const, service: 'AC Repair' },
    { name: 'Nathan Adams', rating: 4, status: 'rating_received' as const, service: 'HVAC Tune-up' },
    { name: 'Samantha Baker', rating: 5, status: 'rating_received' as const, service: 'Furnace Repair' },
    { name: 'Derek Hunt', rating: 2, status: 'feedback_received' as const, service: 'Emergency HVAC' },
    { name: 'Christina Diaz', rating: 5, status: 'rating_received' as const, service: 'AC Installation' },
    { name: 'Marcus Bell', rating: 4, status: 'rating_received' as const, service: 'Duct Cleaning' },
    { name: 'Amy Rivera', rating: 5, status: 'rating_received' as const, service: 'Water Heater Repair' },
    { name: 'Justin Coleman', rating: 5, status: 'rating_received' as const, service: 'HVAC Service' },
  ];

  return customers.map((c, i) => ({
    id: `rr-${String(i + 1).padStart(3, '0')}`,
    businessId: FAKE_BUSINESS_ID,
    customerPhone: `+1555${String(100 + i).padStart(3, '0')}${String(1000 + i).padStart(4, '0')}`,
    customerName: c.name,
    serviceType: c.service,
    status: c.status,
    rating: c.rating,
    sentAt: new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000),
    feedbackReceivedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - (i + 1) * 12 * 60 * 60 * 1000),
  }));
}

function generateFakeFeedbackRecords(): FeedbackRecord[] {
  return [
    {
      id: 'fb-001',
      reviewRequestId: 'rr-005',
      businessId: FAKE_BUSINESS_ID,
      rating: 2,
      feedbackText: "The technician was 45 minutes late and didn't call ahead. The repair itself was fine but the communication needs work.",
      isResolved: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: 'fb-007',
      reviewRequestId: 'rr-001',
      businessId: FAKE_BUSINESS_ID,
      rating: 5,
      isResolved: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      id: 'fb-008',
      reviewRequestId: 'rr-002',
      businessId: FAKE_BUSINESS_ID,
      rating: 5,
      isResolved: false,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: 'fb-002',
      reviewRequestId: 'rr-008',
      businessId: FAKE_BUSINESS_ID,
      rating: 3,
      feedbackText: "Work was okay but I was quoted $150 and ended up paying $220. Would have been nice to know about the extra costs upfront.",
      isResolved: false,
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
    },
    {
      id: 'fb-009',
      reviewRequestId: 'rr-003',
      businessId: FAKE_BUSINESS_ID,
      rating: 4,
      isResolved: false,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
      id: 'fb-003',
      reviewRequestId: 'rr-012',
      businessId: FAKE_BUSINESS_ID,
      rating: 1,
      feedbackText: "Called for an emergency at 8pm and no one answered. Had to find another service. Very disappointing.",
      isResolved: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-010',
      reviewRequestId: 'rr-004',
      businessId: FAKE_BUSINESS_ID,
      rating: 5,
      isResolved: false,
      createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-004',
      reviewRequestId: 'rr-016',
      businessId: FAKE_BUSINESS_ID,
      rating: 2,
      feedbackText: "Pipe repair started leaking again after two days. Need someone to come back and fix it properly.",
      isResolved: false,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-005',
      reviewRequestId: 'rr-021',
      businessId: FAKE_BUSINESS_ID,
      rating: 3,
      isResolved: true,
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'fb-006',
      reviewRequestId: 'rr-026',
      businessId: FAKE_BUSINESS_ID,
      rating: 2,
      feedbackText: "Scheduled between 9-12 and technician showed up at 1:30. I had to take the whole morning off work for nothing.",
      isResolved: true,
      resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
  ];
}

// ─── Mock Auth Service ───────────────────────────────────────────────────────

class MockAuthService implements IAuthService {
  private _session: AuthSession | null = FAKE_SESSION;
  private _listeners: Array<(session: AuthSession | null) => void> = [];

  async signUp(_params: SignUpParams): Promise<Result<AuthUser>> {
    return {
      success: true,
      data: { id: FAKE_USER_ID, email: FAKE_EMAIL, emailVerified: true },
    };
  }

  async signIn(_params: SignInParams): Promise<Result<AuthSession>> {
    this._session = FAKE_SESSION;
    this._notifyListeners();
    return { success: true, data: FAKE_SESSION };
  }

  async signOut(): Promise<Result<void>> {
    this._session = null;
    this._notifyListeners();
    return { success: true, data: undefined };
  }

  async refreshSession(): Promise<Result<AuthSession>> {
    return { success: true, data: FAKE_SESSION };
  }

  async requestPasswordReset(_email: string): Promise<Result<void>> {
    return { success: true, data: undefined };
  }

  async getSession(): Promise<AuthSession | null> {
    return this._session;
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): Unsubscribe {
    this._listeners.push(callback);
    // Fire immediately with current session (mimics Supabase behavior)
    setTimeout(() => callback(this._session), 0);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== callback);
    };
  }

  private _notifyListeners(): void {
    for (const listener of this._listeners) {
      listener(this._session);
    }
  }
}

// ─── Mock Business Profile Repository ────────────────────────────────────────

class MockBusinessProfileRepository implements IBusinessProfileRepository {
  private _profile = { ...FAKE_BUSINESS_PROFILE };

  async getByOwnerId(_ownerId: string): Promise<Result<BusinessProfile>> {
    return { success: true, data: { ...this._profile } };
  }

  async update(
    _businessId: string,
    data: Partial<Pick<BusinessProfile, 'firstName' | 'lastName' | 'businessName' | 'googleReviewUrl'>>,
  ): Promise<Result<BusinessProfile>> {
    if (data.firstName !== undefined) this._profile.firstName = data.firstName;
    if (data.lastName !== undefined) this._profile.lastName = data.lastName;
    if (data.businessName !== undefined) this._profile.businessName = data.businessName;
    if (data.googleReviewUrl !== undefined) this._profile.googleReviewUrl = data.googleReviewUrl;
    this._profile.updatedAt = new Date();
    return { success: true, data: { ...this._profile } };
  }

  async updateSubscriptionTier(
    _businessId: string,
    tier: SubscriptionTier,
  ): Promise<Result<BusinessProfile>> {
    this._profile.subscriptionTier = tier;
    this._profile.updatedAt = new Date();
    return { success: true, data: { ...this._profile } };
  }

  async updateBusinessType(
    _businessId: string,
    businessType: BusinessType,
  ): Promise<Result<BusinessProfile>> {
    this._profile.businessType = businessType;
    this._profile.updatedAt = new Date();
    return { success: true, data: { ...this._profile } };
  }

  async incrementSmsUsage(_businessId: string): Promise<Result<number>> {
    this._profile.smsUsedThisPeriod += 1;
    return { success: true, data: this._profile.smsUsedThisPeriod };
  }

  async resetSmsUsage(_businessId: string): Promise<Result<void>> {
    this._profile.smsUsedThisPeriod = 0;
    return { success: true, data: undefined };
  }

  async getSmsUsage(_businessId: string): Promise<Result<{ used: number; quota: number }>> {
    return {
      success: true,
      data: {
        used: this._profile.smsUsedThisPeriod,
        quota: TIER_QUOTAS[this._profile.subscriptionTier],
      },
    };
  }
}

// ─── Mock Review Request Repository ──────────────────────────────────────────

class MockReviewRequestRepository implements IReviewRequestRepository {
  private _requests = generateFakeReviewRequests();

  async create(request: CreateReviewRequestDTO): Promise<Result<ReviewRequest>> {
    const newRequest: ReviewRequest = {
      id: `rr-${Date.now()}`,
      businessId: request.businessId,
      customerPhone: request.customerPhone,
      customerName: request.customerName,
      serviceType: request.serviceType,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date(),
    };
    this._requests.unshift(newRequest);
    return { success: true, data: newRequest };
  }

  async findByPhoneNumberWithin24Hours(
    _phone: string,
    _businessId: string,
  ): Promise<Result<ReviewRequest | null>> {
    return { success: true, data: null };
  }

  async getRecentByBusiness(_businessId: string, limit: number): Promise<Result<ReviewRequest[]>> {
    return { success: true, data: this._requests.slice(0, limit) };
  }

  async getMonthlyCount(_businessId: string, _monthStart: Date): Promise<Result<number>> {
    return { success: true, data: 47 };
  }

  async getPreviousMonthCount(
    _businessId: string,
    _prevMonthStart: Date,
    _prevMonthEnd: Date,
  ): Promise<Result<number>> {
    return { success: true, data: 38 };
  }

  async updateWithRating(id: string, rating: number): Promise<Result<ReviewRequest>> {
    const request = this._requests.find((r) => r.id === id);
    if (request) {
      request.rating = rating;
      request.status = 'rating_received';
      request.feedbackReceivedAt = new Date();
    }
    return {
      success: true,
      data: request ?? { ...this._requests[0], id, rating },
    };
  }
}

// ─── Mock Feedback Repository ────────────────────────────────────────────────

class MockFeedbackRepository implements IFeedbackRepository {
  private _records = generateFakeFeedbackRecords();

  async create(feedback: CreateFeedbackDTO): Promise<Result<FeedbackRecord>> {
    const newRecord: FeedbackRecord = {
      id: `fb-${Date.now()}`,
      reviewRequestId: feedback.reviewRequestId,
      businessId: feedback.businessId,
      rating: feedback.rating,
      feedbackText: feedback.feedbackText,
      isResolved: false,
      createdAt: new Date(),
    };
    this._records.unshift(newRecord);
    return { success: true, data: newRecord };
  }

  async getUnresolved(_businessId: string): Promise<Result<FeedbackRecord[]>> {
    return {
      success: true,
      data: this._records.filter((r) => !r.isResolved && r.rating <= 3),
    };
  }

  async getAll(_businessId: string): Promise<Result<FeedbackRecord[]>> {
    return { success: true, data: [...this._records] };
  }

  async markResolved(id: string): Promise<Result<FeedbackRecord>> {
    const record = this._records.find((r) => r.id === id);
    if (record) {
      record.isResolved = true;
      record.resolvedAt = new Date();
    }
    return {
      success: true,
      data: record ?? { ...this._records[0], id, isResolved: true, resolvedAt: new Date() },
    };
  }

  async updateFeedbackText(id: string, text: string): Promise<Result<FeedbackRecord>> {
    const record = this._records.find((r) => r.id === id);
    if (record) {
      record.feedbackText = text;
    }
    return {
      success: true,
      data: record ?? { ...this._records[0], id, feedbackText: text },
    };
  }

  async getUnresolvedCount(_businessId: string): Promise<Result<number>> {
    return {
      success: true,
      data: this._records.filter((r) => !r.isResolved).length,
    };
  }
}

// ─── Mock Inbox Item Repository ──────────────────────────────────────────────

class MockInboxItemRepository implements IInboxItemRepository {
  private _items: InboxItem[] = [
    {
      id: 'inbox-opt-out-001',
      businessId: FAKE_BUSINESS_ID,
      type: 'opt_out',
      title: 'Customer Opted Out',
      body: 'Mark Johnson has chosen to stop receiving SMS messages from your business. Future review requests cannot be sent to this phone number unless they opt back in.',
      isDismissed: false,
      metadata: { customerPhone: '(555) 234-8901' },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      id: 'inbox-feedback-001',
      businessId: FAKE_BUSINESS_ID,
      type: 'feedback_received',
      title: 'New Customer Feedback',
      body: 'Sarah Williams shared written feedback about their experience. Scroll down to review and respond.',
      isDismissed: false,
      metadata: { reviewRequestId: 'rr-mock-001' },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  ];

  async getActive(_businessId: string): Promise<Result<InboxItem[]>> {
    const active = this._items.filter((item) => !item.isDismissed);
    return { success: true, data: active };
  }

  async dismiss(itemId: string): Promise<Result<void>> {
    const item = this._items.find((i) => i.id === itemId);
    if (item) {
      item.isDismissed = true;
    }
    return { success: true, data: undefined };
  }
}

// ─── Mock SMS Service ────────────────────────────────────────────────────────

/** Hardcoded phone number that simulates an opted-out customer for local testing. */
const OPTED_OUT_PHONE = '5550000000';

class MockSmsService implements ISmsService {
  private _sentNumbers = new Map<string, string>(); // phone → ISO date

  async sendFeedbackRequest(params: SendSmsParams): Promise<Result<SmsDeliveryResult>> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const normalizedPhone = params.phoneNumber.replace(/\D/g, '');

    // Simulate opt-out error for hardcoded opted-out number
    if (normalizedPhone === OPTED_OUT_PHONE || normalizedPhone === `1${OPTED_OUT_PHONE}`) {
      return {
        success: false,
        error: {
          code: ErrorCode.OPT_OUT,
          message: 'This customer has opted out of receiving SMS messages.',
        },
      };
    }

    // Check if we've already sent to this number (simulate duplicate detection)
    const previousDate = this._sentNumbers.get(normalizedPhone);
    if (previousDate) {
      return {
        success: true,
        data: {
          reviewRequestId: `rr-${Date.now()}`,
          status: 'sent',
          duplicateWarning: true,
          previousRequestDate: previousDate,
        },
      };
    }

    // Record this send
    this._sentNumbers.set(normalizedPhone, new Date().toISOString());

    return {
      success: true,
      data: {
        reviewRequestId: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        status: 'sent',
      },
    };
  }
}

// ─── Mock Notification Service ───────────────────────────────────────────────

class MockNotificationService implements INotificationService {
  async registerDevice(_token: string, _userId: string): Promise<Result<void>> {
    console.log('[MockNotifications] registerDevice called');
    return { success: true, data: undefined };
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    console.log('[MockNotifications] requestPermission called');
    return 'granted';
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    return 'granted';
  }

  onNotificationReceived(_callback: (notification: AppNotification) => void): Unsubscribe {
    // No-op in mock mode
    return () => {};
  }
}

// ─── Mock Monitoring Service ─────────────────────────────────────────────────

class MockMonitoringService implements IMonitoringService {
  captureException(error: Error, context?: Record<string, unknown>): void {
    console.log('[MockMonitoring] captureException:', error.message, context);
  }

  setUser(userId: string): void {
    console.log('[MockMonitoring] setUser:', userId);
  }

  clearUser(): void {
    console.log('[MockMonitoring] clearUser');
  }

  addBreadcrumb(breadcrumb: { category: string; message: string }): void {
    console.log('[MockMonitoring] breadcrumb:', breadcrumb.category, breadcrumb.message);
  }
}

// ─── Mock Analytics Service ──────────────────────────────────────────────────

class MockAnalyticsService implements IAnalyticsService {
  trackEvent(event: { name: string; properties?: Record<string, unknown> }): void {
    console.log('[MockAnalytics] trackEvent:', event.name, event.properties);
  }

  trackScreenView(screenName: string): void {
    console.log('[MockAnalytics] trackScreenView:', screenName);
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    console.log('[MockAnalytics] identify:', userId, traits);
  }

  reset(): void {
    console.log('[MockAnalytics] reset');
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/** Singleton mock auth service so useAuth and ServiceProvider share the same instance. */
const mockAuthService = new MockAuthService();

/**
 * Creates a complete ServiceRegistry with mock implementations.
 * All services return realistic test data and succeed immediately.
 */
// ─── Mock Places Search Service ──────────────────────────────────────────────

const FAKE_PLACES_RESULTS: { placeId: string; name: string; formattedAddress: string; rating?: number }[] = [
  { placeId: 'ChIJ_example1', name: 'SAW Services', formattedAddress: '123 Main St, Austin, TX', rating: 4.8 },
  { placeId: 'ChIJ_example2', name: 'SAW Plumbing & HVAC', formattedAddress: '456 Oak Ave, Austin, TX', rating: 4.5 },
  { placeId: 'ChIJ_example3', name: 'South Austin Plumbing', formattedAddress: '789 Elm St, Austin, TX', rating: 4.2 },
  { placeId: 'ChIJ_example4', name: 'Southwest Air & Water', formattedAddress: '321 Pine Rd, Austin, TX', rating: 4.6 },
];

class MockPlacesSearchService implements IPlacesSearchService {
  async search(query: string): Promise<Result<{ placeId: string; name: string; formattedAddress: string; rating?: number }[]>> {
    if (query.length < 3) {
      return { success: true, data: [] };
    }

    // Call Google Places API directly (bypassing Supabase Edge Function for testing)
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { success: true, data: FAKE_PLACES_RESULTS };
    }

    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating',
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: 'en',
            maxResultCount: 5,
          }),
        },
      );

      if (!response.ok) {
        console.warn('[PlacesSearch] API error:', response.status);
        return { success: true, data: FAKE_PLACES_RESULTS };
      }

      const data = await response.json();
      const places = (data.places || []).map((place: any) => ({
        placeId: place.id,
        name: place.displayName?.text || '',
        formattedAddress: place.formattedAddress || '',
        rating: place.rating,
      }));

      return { success: true, data: places };
    } catch (err) {
      console.warn('[PlacesSearch] Network error:', err);
      return { success: true, data: FAKE_PLACES_RESULTS };
    }
  }
}

export function createMockServiceRegistry(): ServiceRegistry {
  return {
    auth: mockAuthService,
    reviewRequests: new MockReviewRequestRepository(),
    feedback: new MockFeedbackRepository(),
    businessProfile: new MockBusinessProfileRepository(),
    sms: new MockSmsService(),
    notifications: new MockNotificationService(),
    monitoring: new MockMonitoringService(),
    analytics: new MockAnalyticsService(),
    inboxItems: new MockInboxItemRepository(),
    placesSearch: new MockPlacesSearchService(),
  };
}

/**
 * Returns the singleton mock auth service instance.
 * Used for the useAuth hook which needs the same instance as the registry.
 */
export function getMockAuthService(): IAuthService {
  return mockAuthService;
}

/**
 * Returns mock activity feed data including opt-out/opt-in entries.
 * Used by the useRecentActivity hook in mock mode.
 */
export function getMockActivityFeed(): ActivityItem[] {
  return generateFakeActivityFeed();
}

import '../../data/models/user_model.dart';
import '../../data/models/provider_profile_model.dart';
import '../../data/models/job_request_model.dart';
import '../../data/models/booking_model.dart';
import '../../data/models/assistant_message_model.dart';

/// Provides realistic in-memory state and fallback data for Sri Lankan market.
class MockDataService {
  static final MockDataService _instance = MockDataService._internal();
  factory MockDataService() => _instance;
  MockDataService._internal() {
    _initData();
  }

  late UserModel customerUser;
  late UserModel providerUser;
  late List<ProviderProfileModel> providers;
  late List<JobRequestModel> jobRequests;
  late List<BookingModel> bookings;
  late List<JobRequestModel> dispatchOffers;

  void _initData() {
    customerUser = UserModel(
      id: 'usr-cust-001',
      email: 'customer@handee.lk',
      fullName: 'Kasun Perera',
      role: 'Customer',
      phoneNumber: '+94 77 123 4567',
      address: 'No. 42, Flower Road, Colombo 07',
    );

    providerUser = UserModel(
      id: 'usr-prov-002',
      email: 'provider@handee.lk',
      fullName: 'Nimal Jayawardena',
      role: 'Provider',
      phoneNumber: '+94 71 987 6543',
      address: 'No. 18, High Level Road, Nugegoda',
    );

    providers = [
      ProviderProfileModel(
        id: 'prov-001',
        userId: 'usr-prov-002',
        fullName: 'Nimal Jayawardena',
        skillCategories: ['Plumbing', 'Bathroom Fittings'],
        serviceArea: 'Colombo, Nugegoda, Dehiwala',
        rating: 4.9,
        totalReviews: 48,
        completedJobs: 62,
        isVerified: true,
        verificationStatus: 'approved',
        bio: 'Certified master plumber with 8+ years experience in leak fixes, pump repairs, and sanitary fittings.',
        hourlyRate: 2500,
        isOnline: true,
      ),
      ProviderProfileModel(
        id: 'prov-002',
        userId: 'usr-prov-003',
        fullName: 'Dinesh Wickramasinghe',
        skillCategories: ['Electrical', 'AC Repair & Service'],
        serviceArea: 'Colombo, Kotte, Battaramulla',
        rating: 4.8,
        totalReviews: 35,
        completedJobs: 49,
        isVerified: true,
        verificationStatus: 'approved',
        bio: 'NVQ Level 4 certified technician specializing in inverter AC troubleshooting and main distribution boards.',
        hourlyRate: 3000,
        isOnline: true,
      ),
      ProviderProfileModel(
        id: 'prov-003',
        userId: 'usr-prov-004',
        fullName: 'Ruwan Senanayake',
        skillCategories: ['Painting', 'Waterproofing', 'Carpentry'],
        serviceArea: 'Colombo, Gampaha, Kelaniya',
        rating: 4.7,
        totalReviews: 29,
        completedJobs: 38,
        isVerified: true,
        verificationStatus: 'approved',
        bio: 'Expert in interior wall finishes, damp proofing, and wooden furniture repairs.',
        hourlyRate: 2200,
        isOnline: true,
      ),
    ];

    jobRequests = [
      JobRequestModel(
        id: 'job-req-101',
        category: 'Plumbing',
        description: 'Main pipe burst under bathroom sink. Water leaking rapidly onto tiles.',
        location: 'Colombo 07, Flower Road',
        urgency: 'Emergency',
        budgetMin: 3000,
        budgetMax: 7000,
        status: 'approved_for_auto_dispatch',
        customerId: customerUser.id,
        customerName: customerUser.fullName,
        createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
        assignedProvider: providers[0],
        estimatedPrice: 4500,
      ),
      JobRequestModel(
        id: 'job-req-102',
        category: 'Electrical',
        description: 'Circuit breaker trips whenever the living room AC is switched on. Need diagnosis.',
        location: 'Nugegoda, High Level Road',
        urgency: 'High',
        budgetMin: 4000,
        budgetMax: 9000,
        status: 'pending_ai_review',
        customerId: customerUser.id,
        customerName: customerUser.fullName,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
        estimatedPrice: 5500,
      ),
      JobRequestModel(
        id: 'job-req-103',
        category: 'AC Repair & Service',
        description: 'Master bedroom inverter AC routine cleaning and gas check before summer.',
        location: 'Rajagiriya, Lake Road',
        urgency: 'Medium',
        budgetMin: 4500,
        budgetMax: 8000,
        status: 'completed',
        customerId: customerUser.id,
        customerName: customerUser.fullName,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
        assignedProvider: providers[1],
        estimatedPrice: 6000,
      ),
    ];

    bookings = [
      BookingModel(
        id: 'bk-201',
        jobRequestId: 'job-req-101',
        providerId: providerUser.id,
        customerId: customerUser.id,
        status: 'InProgress',
        scheduledAt: DateTime.now().add(const Duration(minutes: 30)),
        createdAt: DateTime.now().subtract(const Duration(minutes: 20)),
        jobRequest: jobRequests[0],
        provider: providers[0],
        customerName: 'Kasun Perera',
        customerPhone: '+94 77 123 4567',
        serviceLocation: 'No. 42, Flower Road, Colombo 07',
        price: 4500,
      ),
      BookingModel(
        id: 'bk-202',
        jobRequestId: 'job-req-103',
        providerId: providers[1].userId,
        customerId: customerUser.id,
        status: 'Completed',
        scheduledAt: DateTime.now().subtract(const Duration(days: 3)),
        createdAt: DateTime.now().subtract(const Duration(days: 3, hours: 2)),
        jobRequest: jobRequests[2],
        provider: providers[1],
        customerName: 'Kasun Perera',
        customerPhone: '+94 77 123 4567',
        serviceLocation: 'Rajagiriya, Lake Road',
        price: 6000,
      ),
    ];

    // Live dispatch offers waiting for Provider
    dispatchOffers = [
      JobRequestModel(
        id: 'offer-301',
        category: 'Plumbing',
        description: 'Urgent overhead water tank overflow float valve replacement.',
        location: 'Dehiwala (2.4 km away)',
        urgency: 'Emergency',
        budgetMin: 4000,
        budgetMax: 6500,
        status: 'approved_for_auto_dispatch',
        customerId: 'usr-cust-999',
        customerName: 'Saman Kumara',
        createdAt: DateTime.now().subtract(const Duration(seconds: 15)),
        estimatedPrice: 5200,
      ),
    ];
  }

  // Assistant Query Simulation
  AssistantMessageModel getAssistantResponse(String query) {
    final lower = query.toLowerCase();

    if (lower.contains('plumb') || lower.contains('leak') || lower.contains('pipe') || lower.contains('water')) {
      return AssistantMessageModel.assistant(
        'I found a verified plumber nearby in Colombo. Nimal has completed 62 jobs with a 4.9 rating and specializes in emergency leak fixes.',
        suggestions: [
          'Request Instant Match for Plumbing',
          'Book Nimal Jayawardena',
          'What is the estimated price band?'
        ],
        recommendedProviders: [providers[0]],
      );
    } else if (lower.contains('ac') || lower.contains('cool') || lower.contains('electric') || lower.contains('wire')) {
      return AssistantMessageModel.assistant(
        'For AC service and electrical faults, Dinesh Wickramasinghe is NVQ-4 certified and available today in the Colombo/Kotte area.',
        suggestions: [
          'Request AC Service (Rs. 4,500 - 8,000)',
          'Book Dinesh for Electrical Diagnosis',
          'View Service Listings'
        ],
        recommendedProviders: [providers[1]],
      );
    } else {
      return AssistantMessageModel.assistant(
        'I can help you find verified tradespeople across Sri Lanka or instantly match an urgent job. What type of work do you need done?',
        suggestions: [
          'Emergency Plumber needed',
          'AC cleaning this weekend',
          'Find an Electrician near Colombo',
          'How does Instant Match work?'
        ],
        recommendedProviders: providers,
      );
    }
  }

  void addJobRequest(JobRequestModel request) {
    jobRequests.insert(0, request);

    // Also simulate creating an incoming dispatch offer for provider
    final offer = request.copyWith(
      id: 'offer-${DateTime.now().millisecondsSinceEpoch}',
      status: 'approved_for_auto_dispatch',
    );
    dispatchOffers.insert(0, offer);
  }

  void acceptDispatchOffer(String offerId, String providerId) {
    final index = dispatchOffers.indexWhere((o) => o.id == offerId);
    if (index != -1) {
      final offer = dispatchOffers.removeAt(index);
      final newBooking = BookingModel(
        id: 'bk-${DateTime.now().millisecondsSinceEpoch}',
        jobRequestId: offer.id,
        providerId: providerId,
        customerId: offer.customerId,
        status: 'Accepted',
        scheduledAt: DateTime.now().add(const Duration(minutes: 45)),
        createdAt: DateTime.now(),
        jobRequest: offer,
        provider: providers.firstWhere((p) => p.userId == providerId, orElse: () => providers[0]),
        customerName: offer.customerName ?? 'Verified Customer',
        customerPhone: '+94 77 555 1234',
        serviceLocation: offer.location,
        price: offer.estimatedPrice ?? 4500,
      );
      bookings.insert(0, newBooking);
    }
  }

  void declineDispatchOffer(String offerId) {
    dispatchOffers.removeWhere((o) => o.id == offerId);
  }

  void updateBookingStatus(String bookingId, String newStatus) {
    final index = bookings.indexWhere((b) => b.id == bookingId);
    if (index != -1) {
      bookings[index] = bookings[index].copyWith(
        status: newStatus,
        updatedAt: DateTime.now(),
      );
    }
  }
}

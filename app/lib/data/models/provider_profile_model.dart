import '../../core/constants/api_endpoints.dart';

class ProviderProfileModel {
  final String id;
  final String userId;
  final String fullName;
  final String? profilePhotoUrl;

  String? get fullProfilePhotoUrl {
    if (profilePhotoUrl == null || profilePhotoUrl!.isEmpty) return null;
    if (profilePhotoUrl!.startsWith('http')) return profilePhotoUrl;
    final cleanPath = profilePhotoUrl!.startsWith('/') ? profilePhotoUrl! : '/$profilePhotoUrl';
    return '${ApiEndpoints.baseUrl}$cleanPath';
  }
  
  final List<String> skillCategories;
  final String serviceArea;
  final double rating;
  final int totalReviews;
  final int completedJobs;
  final bool isVerified;
  final String verificationStatus; // "not_submitted", "pending", "approved", "rejected"
  final String? bio;
  final String? headline;
  final String? description;
  final int yearsOfExperience;
  final List<String> languages;
  final List<String> servicesOffered;
  final double? hourlyRate;
  final bool isOnline;

  ProviderProfileModel({
    required this.id,
    required this.userId,
    required this.fullName,
    this.profilePhotoUrl,
    required this.skillCategories,
    required this.serviceArea,
    this.rating = 4.8,
    this.totalReviews = 0,
    this.completedJobs = 0,
    this.isVerified = true,
    this.verificationStatus = 'approved',
    this.bio,
    this.headline,
    this.description,
    this.yearsOfExperience = 0,
    this.languages = const [],
    this.servicesOffered = const [],
    this.hourlyRate,
    this.isOnline = true,
  });

  factory ProviderProfileModel.fromJson(Map<String, dynamic> json) {
    final rawSkills = (json['serviceCategories'] as List<dynamic>?) ?? (json['skillCategories'] as List<dynamic>?);
    final skills = rawSkills?.map((e) {
      if (e is Map) return e['name']?.toString() ?? '';
      return e.toString();
    }).where((s) => s.isNotEmpty).toList() ?? [];
    
    final rawLangs = json['languages'] as List<dynamic>?;
    final langsList = rawLangs?.map((e) => e.toString()).toList() ?? [];

    final rawServices = json['servicesOffered'] as List<dynamic>?;
    final servicesList = rawServices?.map((e) => e.toString()).toList() ?? [];

    final rawRating = json['rating'] ?? json['ratingAggregate'];
    final rawReviews = json['totalReviews'] ?? json['totalReviewCount'];
    final rawOnline = json['isOnline'] ?? json['isAvailableForWork'];
    final rawArea = json['serviceArea'] ?? json['serviceAreaDisplayName'] ?? json['city'];
    final rawPhoto = json['profilePhotoUrl'] ?? json['profilePictureUrl'];
    final statusStr = json['verificationStatus']?.toString() ?? 'approved';

    return ProviderProfileModel(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? 'Service Provider',
      profilePhotoUrl: rawPhoto?.toString(),
      skillCategories: skills,
      serviceArea: rawArea?.toString() ?? 'Colombo',
      rating: rawRating != null ? (rawRating as num).toDouble() : 4.8,
      totalReviews: (rawReviews as num?)?.toInt() ?? 0,
      completedJobs: (json['completedJobs'] as num?)?.toInt() ?? 0,
      isVerified: json['isVerified'] as bool? ?? (statusStr.toLowerCase() == 'verified'),
      verificationStatus: statusStr,
      bio: json['bio']?.toString() ?? json['headline']?.toString(),
      headline: json['headline']?.toString(),
      description: json['description']?.toString(),
      yearsOfExperience: (json['yearsOfExperience'] as num?)?.toInt() ?? 0,
      languages: langsList,
      servicesOffered: servicesList,
      hourlyRate: (json['hourlyRate'] as num?)?.toDouble(),
      isOnline: rawOnline as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'fullName': fullName,
      'profilePhotoUrl': profilePhotoUrl,
      'skillCategories': skillCategories,
      'serviceArea': serviceArea,
      'rating': rating,
      'totalReviews': totalReviews,
      'completedJobs': completedJobs,
      'isVerified': isVerified,
      'verificationStatus': verificationStatus,
      'bio': bio,
      'headline': headline,
      'description': description,
      'yearsOfExperience': yearsOfExperience,
      'languages': languages,
      'hourlyRate': hourlyRate,
      'isOnline': isOnline,
    };
  }

  ProviderProfileModel copyWith({
    String? id,
    String? userId,
    String? fullName,
    String? profilePhotoUrl,
    List<String>? skillCategories,
    String? serviceArea,
    double? rating,
    int? totalReviews,
    int? completedJobs,
    bool? isVerified,
    String? verificationStatus,
    String? bio,
    String? headline,
    String? description,
    int? yearsOfExperience,
    List<String>? languages,
    double? hourlyRate,
    bool? isOnline,
  }) {
    return ProviderProfileModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      fullName: fullName ?? this.fullName,
      profilePhotoUrl: profilePhotoUrl ?? this.profilePhotoUrl,
      skillCategories: skillCategories ?? this.skillCategories,
      serviceArea: serviceArea ?? this.serviceArea,
      rating: rating ?? this.rating,
      totalReviews: totalReviews ?? this.totalReviews,
      completedJobs: completedJobs ?? this.completedJobs,
      isVerified: isVerified ?? this.isVerified,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      bio: bio ?? this.bio,
      headline: headline ?? this.headline,
      description: description ?? this.description,
      yearsOfExperience: yearsOfExperience ?? this.yearsOfExperience,
      languages: languages ?? this.languages,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      isOnline: isOnline ?? this.isOnline,
    );
  }
}

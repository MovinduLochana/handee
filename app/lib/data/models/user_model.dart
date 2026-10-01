class UserModel {
  final String id;
  final String email;
  final String fullName;
  final String role; // "Customer" or "Provider"
  final String? phoneNumber;
  final String? avatarUrl;
  final String? address;
  final String? providerVerificationStatus;

  UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.phoneNumber,
    this.avatarUrl,
    this.address,
    this.providerVerificationStatus,
  });

  bool get isProvider => role.toLowerCase() == 'provider';
  bool get isCustomer => role.toLowerCase() == 'customer';
  bool get isVerifiedProvider => isProvider && (providerVerificationStatus?.toLowerCase() == 'verified');

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final rolesList = json['roles'] as List<dynamic>?;
    final parsedRole = (rolesList != null && rolesList.isNotEmpty)
        ? rolesList.first.toString()
        : (json['role']?.toString() ?? 'Customer');

    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['name']?.toString() ?? 'User',
      role: parsedRole,
      phoneNumber: json['phoneNumber']?.toString(),
      avatarUrl: json['avatarUrl']?.toString() ?? json['profilePictureUrl']?.toString(),
      address: json['address']?.toString(),
      providerVerificationStatus: json['providerVerificationStatus']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'role': role,
      'phoneNumber': phoneNumber,
      'avatarUrl': avatarUrl,
      'address': address,
      'providerVerificationStatus': providerVerificationStatus,
    };
  }

  UserModel copyWith({
    String? id,
    String? email,
    String? fullName,
    String? role,
    String? phoneNumber,
    String? avatarUrl,
    String? address,
    String? providerVerificationStatus,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      address: address ?? this.address,
      providerVerificationStatus: providerVerificationStatus ?? this.providerVerificationStatus,
    );
  }
}

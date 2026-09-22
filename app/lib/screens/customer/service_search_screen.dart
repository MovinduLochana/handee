import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/colors.dart';
import '../../../providers/service_directory_provider.dart';
import '../../../providers/service_category_provider.dart';
import '../../../widgets/provider_listing_card.dart';
import '../../../widgets/service_listing_card.dart';
import 'public_provider_profile_screen.dart';
import 'create_job_screen.dart';

class ServiceSearchScreen extends StatefulWidget {
  final String? initialCategory;

  const ServiceSearchScreen({super.key, this.initialCategory});

  @override
  State<ServiceSearchScreen> createState() => _ServiceSearchScreenState();
}

class _ServiceSearchScreenState extends State<ServiceSearchScreen> {
  late TextEditingController _searchController;
  String? _selectedCategory;
  bool _isProviderSearch = true;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
    _selectedCategory = widget.initialCategory;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _performSearch();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _performSearch() {
    final provider = context.read<ServiceDirectoryProvider>();
    final catProvider = context.read<ServiceCategoryProvider>();
    
    String? categoryId;
    if (_selectedCategory != null) {
      final found = catProvider.categories.where((c) => c.name == _selectedCategory);
      if (found.isNotEmpty) {
        categoryId = found.first.id;
      }
    }

    final searchTerm = _searchController.text.trim();

    if (_isProviderSearch) {
      provider.searchProviders(
        searchTerm: searchTerm,
        categoryId: categoryId,
      );
    } else {
      provider.searchServices(
        query: searchTerm,
        categoryId: categoryId,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 90,
        titleSpacing: 24,
        elevation: 0,
        backgroundColor: Colors.white,
        title: const Text(
          'Explore',
          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: -1.5, color: AppColors.textPrimary),
        ),
      ),
      body: Column(
        children: [
          // Filter & Search Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                // Search Bar
                Container(
                  margin: const EdgeInsets.only(bottom: 12, left: 8, right: 8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight, width: 1.5),
                  ),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'What are you looking for?',
                      hintStyle: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.w600, fontSize: 16),
                      prefixIcon: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12.0),
                        child: Icon(Icons.search, size: 24, color: AppColors.primary),
                      ),
                      prefixIconConstraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.close, size: 24, color: AppColors.textMuted),
                        onPressed: () {
                          _searchController.clear();
                          _performSearch();
                        },
                      ),
                    ),
                    onSubmitted: (_) => _performSearch(),
                  ),
                ),
                
                // Categories Scroll
                Consumer<ServiceCategoryProvider>(
                  builder: (context, catProvider, _) {
                    if (catProvider.isLoading && catProvider.categories.isEmpty) {
                      return const Center(child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                      ));
                    }
                    
                    return SizedBox(
                      height: 60,
                      child: ListView.builder(
                        clipBehavior: Clip.none,
                        scrollDirection: Axis.horizontal,
                        itemCount: catProvider.categories.length + 1,
                        itemBuilder: (context, index) {
                          if (index == 0) {
                            final isSelected = _selectedCategory == null;
                            return _buildCategoryChip('All Categories', isSelected, () {
                              setState(() => _selectedCategory = null);
                              _performSearch();
                            });
                          }
                          final cat = catProvider.categories[index - 1];
                          final catName = cat.name;
                          final isSelected = _selectedCategory == catName;
                          return _buildCategoryChip(catName, isSelected, () {
                            setState(() => _selectedCategory = catName);
                            _performSearch();
                          });
                        },
                      ),
                    );
                  }
                ),
                const SizedBox(height: 12),
                
                // Toggle Search Type
                Row(
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8.0),
                        child: SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: true, label: Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Professionals', style: TextStyle(fontWeight: FontWeight.w700)))),
                            ButtonSegment(value: false, label: Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('Services', style: TextStyle(fontWeight: FontWeight.w700)))),
                          ],
                          selected: {_isProviderSearch},
                          onSelectionChanged: (Set<bool> newSelection) {
                            setState(() {
                              _isProviderSearch = newSelection.first;
                            });
                            _performSearch();
                          },
                          style: ButtonStyle(
                            backgroundColor: WidgetStateProperty.resolveWith<Color>(
                              (Set<WidgetState> states) {
                                if (states.contains(WidgetState.selected)) {
                                  return AppColors.textPrimary;
                                }
                                return AppColors.background;
                              },
                            ),
                            foregroundColor: WidgetStateProperty.resolveWith<Color>(
                              (Set<WidgetState> states) {
                                if (states.contains(WidgetState.selected)) {
                                  return Colors.white;
                                }
                                return AppColors.textMuted;
                              },
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const Divider(height: 1),
          
          // Results
          Expanded(
            child: Consumer<ServiceDirectoryProvider>(
              builder: (context, directoryProvider, child) {
                if (directoryProvider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                if (directoryProvider.errorMessage != null) {
                  return Center(
                    child: Text(
                      'Error: ${directoryProvider.errorMessage}',
                      style: const TextStyle(color: Colors.red),
                    ),
                  );
                }

                if (_isProviderSearch) {
                  final results = directoryProvider.searchResults;
                  if (results.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppColors.background, shape: BoxShape.circle),
                            child: const Icon(Icons.person_search_outlined, size: 80, color: AppColors.primary),
                          ),
                          const SizedBox(height: 12),
                          const Text("No providers found",
                              style: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                          const SizedBox(height: 4),
                          const Text("Please refine your search criteria and try again.",
                              style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                        ],
                      ),
                    );
                  }
                  
                  return RefreshIndicator(
                    onRefresh: () async => _performSearch(),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: results.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final provider = results[index];
                        return ProviderListingCard(
                          provider: provider,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => PublicProviderProfileScreen(providerId: provider.id),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  );
                } else {
                  final results = directoryProvider.serviceSearchResults;
                  if (results.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppColors.background, shape: BoxShape.circle),
                            child: const Icon(Icons.manage_search_outlined, size: 80, color: AppColors.primary),
                          ),
                          const SizedBox(height: 12),
                          const Text("No services found",
                              style: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                          const SizedBox(height: 4),
                          const Text("Adjust your filters or try a different category.",
                              style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                        ],
                      ),
                    );
                  }
                  
                  return RefreshIndicator(
                    onRefresh: () async => _performSearch(),
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: results.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final listing = results[index];
                        return ServiceListingCard(
                          listing: listing,
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => CreateJobScreen(initialCategory: listing.serviceCategoryName),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(right: 12, top: 4, bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.textPrimary : AppColors.primaryUltraLight,
          borderRadius: BorderRadius.circular(24),
          boxShadow: isSelected ? [BoxShadow(color: AppColors.textPrimary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))] : [],
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.primary,
            fontWeight: FontWeight.w800,
            fontSize: 15,
            letterSpacing: -0.3,
          ),
        ),
      ),
    );
  }
}

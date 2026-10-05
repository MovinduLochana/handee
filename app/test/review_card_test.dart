import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:app/data/models/review_model.dart';
import 'package:app/widgets/review_card.dart';

void main() {
  testWidgets('ReviewCard renders reviewer name, rating stars, formatted date, and comment', (tester) async {
    final review = ReviewModel(
      id: 'rev-01',
      providerProfileId: 'prov-01',
      customerId: 'cust-01',
      customerName: 'Saman Kumara',
      rating: 4,
      comment: 'Arrived promptly and fixed the leak cleanly.',
      createdAt: DateTime(2026, 10, 2, 14, 30),
      photoUrls: ['https://cdn.handee.lk/photo1.jpg'],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReviewCard(review: review),
        ),
      ),
    );

    expect(find.text('Saman Kumara'), findsOneWidget);
    expect(find.text('Arrived promptly and fixed the leak cleanly.'), findsOneWidget);
    expect(find.byIcon(Icons.star_rounded), findsNWidgets(4));
    expect(find.byIcon(Icons.star_outline_rounded), findsNWidgets(1));
    expect(find.textContaining('Oct 2, 2026'), findsOneWidget);
  });

  testWidgets('ReviewCard normalizes relative photoUrls so uploaded images can be viewed', (tester) async {
    final review = ReviewModel(
      id: 'rev-02',
      providerProfileId: 'prov-01',
      customerId: 'cust-01',
      customerName: 'Kamal Perera',
      rating: 5,
      createdAt: DateTime.now(),
      photoUrls: ['/uploads/reviews/work.jpg'],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReviewCard(review: review),
        ),
      ),
    );

    final imgFinder = find.byWidgetPredicate(
      (w) => w is Image && w.image is NetworkImage && (w.image as NetworkImage).url.contains('/uploads/reviews/work.jpg') && (w.image as NetworkImage).url.startsWith('http'),
    );
    expect(imgFinder, findsOneWidget);
  });
}

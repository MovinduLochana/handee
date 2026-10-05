import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:app/widgets/star_rating_picker.dart';

void main() {
  testWidgets('StarRatingPicker renders 5 stars and triggers onRatingChanged when tapped', (tester) async {
    int selectedRating = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StarRatingPicker(
            initialRating: 3,
            onRatingChanged: (rating) {
              selectedRating = rating;
            },
          ),
        ),
      ),
    );

    // Initial state: 3 filled stars, 2 outline stars
    expect(find.byIcon(Icons.star_rounded), findsNWidgets(3));
    expect(find.byIcon(Icons.star_outline_rounded), findsNWidgets(2));

    // Tap on the 5th star
    await tester.tap(find.byKey(const Key('star_rating_5')));
    await tester.pumpAndSettle();

    expect(selectedRating, 5);
    expect(find.byIcon(Icons.star_rounded), findsNWidgets(5));
    expect(find.byIcon(Icons.star_outline_rounded), findsNothing);
  });

  testWidgets('StarRatingPicker updates rating on horizontal drag', (tester) async {
    int selectedRating = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: StarRatingPicker(
              initialRating: 1,
              size: 40,
              onRatingChanged: (rating) {
                selectedRating = rating;
              },
            ),
          ),
        ),
      ),
    );

    // Initial: 1 filled star
    expect(find.byIcon(Icons.star_rounded), findsNWidgets(1));

    // Drag across the star bar
    final firstStar = find.byKey(const Key('star_rating_1'));
    await tester.drag(firstStar, const Offset(150, 0));
    await tester.pumpAndSettle();

    expect(selectedRating, greaterThanOrEqualTo(3));
  });
}


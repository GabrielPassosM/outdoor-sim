.PHONY: dev deploy deploy-hosting deploy-functions deploy-firestore clean

# Start the Firebase Local Emulator Suite
# We explicitly set the PATH to include the Homebrew Java installation
# so that the Firestore emulator works correctly.
dev:
	export PATH="/opt/homebrew/opt/openjdk/bin:$$PATH" && firebase emulators:start

# Deploy everything to Firebase
deploy:
	firebase deploy

# Deploy only Firebase Hosting
deploy-hosting:
	firebase deploy --only hosting

# Deploy only Cloud Functions
deploy-functions:
	firebase deploy --only functions

# Deploy only Firestore rules and indexes
deploy-firestore:
	firebase deploy --only firestore

# Clean up Firebase debug logs
clean:
	rm -f firebase-debug.log firebase-debug.*.log

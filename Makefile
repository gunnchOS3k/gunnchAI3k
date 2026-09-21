.PHONY: test reproduce

test:
	npm run test:local-runtime
	npm run test:stage2
	npm run test:waike-mastery
	npm run test:journeys

reproduce: test

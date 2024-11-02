import {combinations, MafiaCalculator} from "../src/utils/MafiaCalculator";
import {Suspicion} from "../src/models/models";

describe('MafiaCalculator', () => {
    let calculator: MafiaCalculator;

    beforeEach(() => {
        calculator = new MafiaCalculator();
    });

    test('parseEvent', () => {
        expect(calculator.parseEvent("1s7")).toEqual([1, "s", 7]);
        expect(calculator.parseEvent("5: 3 4 8")).toEqual([5, "V", [3, 4, 8]]);
    });

    test('initializeGraphs', () => {
        expect(calculator.blackTogetherGraph.nodes.length).toBe(10);
        for (let [player1, player2] of combinations(calculator.players, 2)) {
            expect(calculator.getEdgeWeight(calculator.blackTogetherGraph, player1, player2)).toBe(1.0);
            expect(calculator.getEdgeWeight(calculator.relationshipsGraph, player1, player2)).toBe(6 / 9);
        }
    });

    test('applyEventSuspicion', () => {
      calculator.applyEvent(1, "s", 7);

      // Create an instance of the Suspicion class to access its properties
      const suspicionInstance = new Suspicion();
      const expectedWeight = (1 - suspicionInstance.breakingWeight);

      expect(calculator.getEdgeWeight(calculator.blackTogetherGraph, 1, 7)).toBeCloseTo(expectedWeight);
      expect(calculator.getEdgeWeight(calculator.relationshipsGraph, 1, 7)).toBeCloseTo(6 / 9 * (1 - suspicionInstance.strength));
    });


    test('generateTriplets', () => {
        calculator.applyEvent(1, "s", 2);
        calculator.applyEvent(3, "v", 4);
        const triplets = calculator.generateTriplets(1);
        expect(triplets.length).toBe(10);
        triplets.forEach(({players}) => {
            expect(players).not.toContain(1);
        });
        const probs = triplets.map(({probability}) => probability);
        expect(probs).toEqual([...probs].sort((a, b) => b - a));
    });

    test('tripletGenerationNoEvents', () => {
        const triplets = calculator.generateTriplets(1);
        expect(triplets.length).toBe(10);
        triplets.forEach(({players, probability}) => {
            expect(players).not.toContain(1);
            expect(probability).toBeCloseTo((1 - (6 / 9)) ** 3);
        });
    });

    test('tripletGenerationWithEvents', () => {
        calculator.applyEvent(1, "s", 2);
        calculator.applyEvent(3, "v", 4);
        const triplets = calculator.generateTriplets(1);
        expect(triplets.length).toBe(10);
        triplets.forEach(({players, probability}) => {
            expect(players).not.toContain(1);
            expect(probability).toBeLessThanOrEqual(1.0);
        });
        const probs = triplets.map(({probability}) => probability);
        expect(probs).toEqual([...probs].sort((a, b) => b - a));
        expect(calculator.calculateRedness(5)).toBeCloseTo(6 / 9);
        calculator.applyEvent(2, "s", 5);
        calculator.applyEvent(3, "v", 5);
        const redness = calculator.calculateRedness(5);
        expect(redness).toBeGreaterThanOrEqual(0.0);
        expect(redness).toBeLessThan(1.0);
    });

    test('calculateVoting', () => {
        const event = calculator.parseEvent("1: 2,3,4,6, 7");
        expect(event).toEqual([1, "V", [2, 3, 4, 6, 7]]);
        const source = event[0];
        const action = event[1];
        const target = event[2];

        if (source !== null) {
            if (target !== null) {
                if (action !== null) {
                    calculator.applyEvent(source, action, target);
                }
            }
        }

        [2, 3, 4, 6, 7].forEach(target => {
            expect(calculator.getEdgeWeight(calculator.blackTogetherGraph, 1, target)).toBeLessThan(1.0);
            expect(calculator.getEdgeWeight(calculator.relationshipsGraph, 1, target)).toBeGreaterThan(0.0);
        });
    });

    test('votingLogic', () => {
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(calculator.eliminatedPlayers.has(1)).toBe(true);
    });

    test('votingLogic2', () => {
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(false);
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(true);
        calculator.parseEvent("1s7");
        expect(calculator.messages[calculator.messages.length - 1]).toBe("Tie in voting, expected 'vel' or 'novel' command.");
    });

    test('velCommand', () => {
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(false);
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(true);
        calculator.parseEvent("vel");
        calculator.processEvents(["4eo"]);
        expect(calculator.eliminatedPlayers.has(1)).toBe(true);
        expect(calculator.eliminatedPlayers.has(2)).toBe(true);
        expect(calculator.eliminatedPlayers.has(4)).toBe(true);
    });

    test('novelCommand', () => {
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(false);
        calculator.applyEvent(1, "v", [1, 2, 3, 4, 5]);
        calculator.applyEvent(2, "v", [6, 7, 8, 9, 10]);
        expect(calculator.secondVotingStage).toBe(true);
        expect(calculator.expectingVel).toBe(true);
        calculator.parseEvent("novel");
        expect(calculator.eliminatedPlayers.size).toBe(0);
    });

    test('validTriplets', () => {
        expect(calculator.validTriplet(4, 5, 6)).toBe(true);

        calculator.eliminatedPlayers = new Set([1, 2, 3, 4]);

        expect(calculator.validTriplet(1, 2, 3)).toBe(false);
        expect(calculator.validTriplet(5, 6, 7)).toBe(false);
        expect(calculator.validTriplet(4, 5, 6)).toBe(true);

        calculator.eliminatedPlayers = new Set([1, 2, 3, 4, 5]);

        expect(calculator.validTriplet(6, 7, 8)).toBe(false);
        expect(calculator.validTriplet(5, 7, 8)).toBe(true);

        calculator.eliminatedPlayers = new Set([1, 2, 3, 4, 5, 6]);

        expect(calculator.validTriplet(6, 7, 8)).toBe(false);
        expect(calculator.validTriplet(5, 6, 7)).toBe(true);

        calculator.eliminatedPlayers = new Set([1, 2, 3, 4, 5, 6, 7]);

        expect(calculator.validTriplet(5, 6, 8)).toBe(true);
        expect(calculator.validTriplet(6, 8, 9)).toBe(false);
    });

    test('twoBlackChecks', () => {
        calculator.processSingleEvent("3cb5");
        calculator.processSingleEvent("3cb6");
        const triplets = calculator.generateTriplets(1).map(t => t.players);
        expect(new Set(triplets)).toEqual(new Set([
            [2, 5, 6],
            [4, 5, 6],
            [5, 6, 7],
            [5, 6, 8],
            [5, 6, 9],
            [5, 6, 10],
        ]));
    });

    test('noTripletWithRedCheckWithoutSheriff', () => {
        calculator.processSingleEvent("3cr5");
        const triplets = calculator.generateTriplets(1).map(t => t.players);
        triplets.forEach(triplet => {
            if (triplet.includes(5)) {
                expect(triplet).toContain(3);
            }
        });
    });

    test('playerCheckedBothSheriffs', () => {
        calculator.processSingleEvent("3cr5");
        calculator.processSingleEvent("4cr5");
        const triplets = calculator.generateTriplets(1).map(t => t.players);
        triplets.forEach(triplet => {
            expect(triplet).not.toContain(5);
        });
    });

    test('blackChecksTwo', () => {
        calculator.processSingleEvent("3cb5");
        calculator.processSingleEvent("3cb7");
        const triplets = calculator.generateTriplets(7).map(t => t.players);
        triplets.forEach(triplet => {
            expect(triplet).toContain(3);
            expect(triplet).not.toContain(5);
        });
    });

    test('twoSheriffsTwoBlackChecks', () => {
        calculator.processSingleEvent("1cb2");
        calculator.processSingleEvent("3cb2");
        let triplets = calculator.generateTriplets(1).map(t => t.players);
        triplets.forEach(triplet => {
            expect(triplet).toContain(2);
            expect(triplet).toContain(3);
        });
        triplets = calculator.generateTriplets(3).map(t => t.players);
        triplets.forEach(triplet => {
            expect(triplet).toContain(1);
            expect(triplet).toContain(2);
        });
    });
});

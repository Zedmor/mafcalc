import {combinations, MafiaCalculator} from "../src/utils/MafiaCalculator";
import {Redness, Suspicion} from "../src/models/models";

describe('MafiaCalculator', () => {
    let calculator: MafiaCalculator;

    beforeEach(() => {
        calculator = new MafiaCalculator();
    });

    test('parseEventMultipleRedPlayers', () => {
        expect(calculator.parseEvent("4+7890")).toEqual([4, 'r', [7, 8, 9, 10]]);
    });

    test('applyEventMultipleRedPlayers', () => {
        calculator.applyEvent(4, 'r', [7, 8, 9, 10]);

        // Verify that the relationships between source and each target have been updated
        [7, 8, 9, 10].forEach(target => {
            const relationshipEdge = calculator.relationshipsGraph.edges.find(edge =>
                edge.source === 4 && edge.target === target
            );
            expect(relationshipEdge).toBeDefined();

            // Calculate expected weight after applying Redness action
            const rednessInstance = new Redness(4, target);
            const expectedWeight = Math.max(0, Math.min(1, (6 / 9) * (1 - rednessInstance.getStrength())));
            expect(relationshipEdge!.weight).toBeCloseTo(expectedWeight);
        });
    });

    test('parseEventZeroAsTen', () => {
        expect(calculator.parseEvent("4+0")).toEqual([4, 'r', [10]]);
        calculator.applyEvent(4, 'r', [10]);

        const relationshipEdge = calculator.relationshipsGraph.edges.find(edge =>
            edge.source === 4 && edge.target === 10
        );
        expect(relationshipEdge).toBeDefined();

        // Verify the weight has been updated
        const rednessInstance = new Redness(4, 10);
        const expectedWeight = Math.max(0, Math.min(1, (6 / 9) * (1 - rednessInstance.getStrength())));
        expect(relationshipEdge!.weight).toBeCloseTo(expectedWeight);
    });

    test('parseEvent', () => {
        expect(calculator.parseEvent("1s7")).toEqual([1, "s", 7]);
        expect(calculator.parseEvent("5: 3 4 8")).toEqual([5, "v", [3, 4, 8]]);
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
        const suspicionInstance = new Suspicion(1, 7);
        const expectedWeight = (1 - suspicionInstance.getBreakingWeight());

        expect(calculator.getEdgeWeight(calculator.blackTogetherGraph, 1, 7)).toBeCloseTo(expectedWeight);
        expect(calculator.getEdgeWeight(calculator.relationshipsGraph, 1, 7)).toBeCloseTo(6 / 9 * (1 - suspicionInstance.getStrength()));
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

    test('parseEventVotingSpaces', () => {
        const event = calculator.parseEvent("1: 2,3,4,6, 7");
        expect(event).toEqual([1, "v", [2, 3, 4, 6, 7]]);
    })

    test('calculateVoting', () => {
        const event = calculator.parseEvent("1: 2,3,4,6, 7");
        expect(event).toEqual([1, "v", [2, 3, 4, 6, 7]]);
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

    test('votingDoNotAffectBlackTogether', () => {
        calculator.processSingleEvent("9e");
        calculator.processSingleEvent("2: 1,3,5");
        calculator.processSingleEvent("3: 2,8");
        calculator.processSingleEvent("5: 4,6,7,10");

        const source = 1;
        const target = 5;

        const blackTogetherEdge = calculator.blackTogetherGraph.edges.find(edge =>
            (edge.source === source && edge.target === target) ||
            (edge.source === target && edge.target === source)
        )

        expect(blackTogetherEdge).toBeDefined();

    })

    test('sheriffAdvisor', () => {
        calculator.processSingleEvent("3s2");
        calculator.processSingleEvent("7s2");
        calculator.processSingleEvent("5s7");
        calculator.processSingleEvent("8s4");
        calculator.processSingleEvent("10rc9");
        calculator.processSingleEvent("3s4");
        calculator.processSingleEvent("4rc2");
        calculator.processSingleEvent("3rc2");
        calculator.processSingleEvent("9e");
        calculator.processSingleEvent("9s2");
        calculator.processSingleEvent("9s7");
        calculator.processSingleEvent("9s10");

        const sheriffAdvise = calculator.sheriffAdvisor();

        console.log(sheriffAdvise);

    })

    test('twoSheriffsTwo', () => {
        calculator.processSingleEvent("9cr6");
        calculator.processSingleEvent("8cb6");

        const doubleRedPlayers = calculator.getDoubleRedPlayers();

        expect(Array.from(doubleRedPlayers)).toEqual([]);

    })

    test('Double Red player', () => {
        calculator.processSingleEvent("9cr6");
        calculator.processSingleEvent("8cr6");

        const doubleRedPlayers = calculator.getDoubleRedPlayers();

        expect(Array.from(doubleRedPlayers)).toContain(6);
    })

    test('Insignificant vote when all players vote for target', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set(); // No players are eliminated

        // All active players (excluding target) vote for player 1
        const event = calculator.handleVoting('1: 2,3,4,5,6,7,8,9,10');
        expect(event).toEqual([1, 'vs', [2, 3, 4, 5, 6, 7, 8, 9, 10]]);
    });

    test('Significant vote when some players vote for target', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set();

        // A subset of players vote for player 1
        const event = calculator.handleVoting('1: 2,3,4');
        expect(event).toEqual([1, 'v', [2, 3, 4]]);
    });

    test('Insignificant vote when only one player votes', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set();

        // Only one player votes for player 1
        const event = calculator.handleVoting('1: 2');
        expect(event).toEqual([1, 'vs', [2]]);
    });

    test('Significant vote with half of the players voting', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set();

        // Half of the active players vote for player 1
        const event = calculator.handleVoting('1: 2,3,4,5,6');
        expect(event).toEqual([1, 'v', [2, 3, 4, 5, 6]]);
    });

    test('Insignificant vote when all but one player vote', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set();

        // All active players except one vote for player 1
        const event = calculator.handleVoting('1: 2,3,4,5,6,7,8,9');
        expect(event).toEqual([1, 'vs', [2, 3, 4, 5, 6, 7, 8, 9]]);
    });

    test('Significant vote with eliminated players considered', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set([9, 10]); // Players 9 and 10 are eliminated

        // Active players are 1-8; some vote for player 1
        const event = calculator.handleVoting('1: 2,3,4');
        expect(event).toEqual([1, 'v', [2, 3, 4]]);
    });

    test('Insignificant vote with almost all active players voting', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set([9, 10]); // Players 9 and 10 are eliminated

        // Active players are 1-8; all but one vote for player 1
        const event = calculator.handleVoting('1: 2,3,4,5,6,7');
        expect(event).toEqual([1, 'vs', [2, 3, 4, 5, 6, 7]]);
    });

    test('Significant vote after some players are eliminated', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set([2, 3]); // Players 2 and 3 are eliminated

        // Active players vote for player 1
        const event = calculator.handleVoting('1: 4,5,6');
        expect(event).toEqual([1, 'v', [4, 5, 6]]);
    });

    test('Insignificant vote when only one active player votes', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set([2, 3, 4, 5, 6, 7, 8, 9]); // Many players are eliminated

        // Only player 10 is active besides the target
        const event = calculator.handleVoting('1: 10');
        expect(event).toEqual([1, 'vs', [10]]);
    });

    test('Significant vote with multiple but not all active players voting', () => {
        const calculator = new MafiaCalculator();
        calculator.eliminatedPlayers = new Set([8, 9, 10]); // Players 8-10 are eliminated

        // Active players are 1-7; some vote for player 1
        const event = calculator.handleVoting('1: 2,3,4');
        expect(event).toEqual([1, 'v', [2, 3, 4]]);
    });

});

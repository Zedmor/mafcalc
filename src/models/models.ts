export class Action {
    static command: string;
    static breakingWeight: number;
    static reverseStrength: number;
    static strength: number;

    constructor(public source: number, public target: number | null) {}

    static getClassForAction(command: string): typeof Action | null {
        // Iterate over all subclasses of Action
        for (const subclass of Action.subclasses) {
            if (subclass.command === command) {
                return subclass;
            }
        }
        return null;
    }

    // This will hold all subclasses
    static subclasses: Array<typeof Action> = [];

    getCommand(): string {
        return (this.constructor as typeof Action).command;
    }

    getBreakingWeight(): number {
        return (this.constructor as typeof Action).breakingWeight;
    }

    getReverseStrength(): number {
        return (this.constructor as typeof Action).reverseStrength;
    }

    getStrength(): number {
        return (this.constructor as typeof Action).strength;
    }


}

class Suspicion extends Action {
    static command = 's';
    static breakingWeight = 0.5;
    static reverseStrength = 0.1;
    static strength = 0.2;
}

class Redness extends Action {
    static command = 'r';
    static breakingWeight = 0;
    static reverseStrength = 0;
    static strength = -0.15;
}

class RednessStrong extends Action {
    static command = 'rr';
    static breakingWeight = 0;
    static reverseStrength = 0;
    static strength = -1;
}

class StrongSuspicion extends Action {
    static command = 'ss';
    static breakingWeight = 0.85;
    static reverseStrength = 0.15;
    static strength = 0.3;
}

class Voted extends Action {
    static command = 'v';
    static breakingWeight = 0.85;
    static reverseStrength = 0.3;
    static strength = 0.6;
}

class VotedSoft extends Action {
    static command = 'vs';
    static breakingWeight = 0.4;
    static reverseStrength = 0.15;
    static strength = 0.3;
}

class RequestedCheck extends Action {
    static command = 'rc';
    static breakingWeight = 0.7;
    static reverseStrength = 0.1;
    static strength = 0.3;
}

class CheckedBlack extends Action {
    static command = 'cb';
    static breakingWeight = 0.85;
    static reverseStrength = 1;
    static strength = 1;
}

class CheckedRed extends Action {
    static command = 'cr';
    static breakingWeight = 0;
    static reverseStrength = -0.1;
    static strength = 1;
}

class Other extends Action {
    static command = 'o';
    static breakingWeight = 0.8;
    static reverseStrength = 0;
    static strength = 0;
}

class OtherSheriff extends Action {
    static command = 'os';
    static breakingWeight = 1;
    static reverseStrength = 0;
    static strength = 0;
}

class EliminatedAction extends Action {
    static command = ''; // No command specified in Python
    static breakingWeight = 0;
    static reverseStrength = 0;
    static strength = 0;
}

class Eliminated extends Action {
    static command = 'e';
    static breakingWeight = 0.99;
    static reverseStrength = 0;
    static strength = 0;
}

class EliminatedSheriff extends Action {
    static command = 'es';
    static breakingWeight = 0.9;
    static reverseStrength = 0;
    static strength = 0;
}

class EliminatedOther extends Action {
    static command = 'eo';
    static breakingWeight = 0;
    static reverseStrength = 0;
    static strength = 0;
}

Action.subclasses.push(
    Suspicion,
    Redness,
    RednessStrong,
    StrongSuspicion,
    Voted,
    VotedSoft,
    RequestedCheck,
    CheckedBlack,
    CheckedRed,
    Other,
    OtherSheriff,
    EliminatedAction,
    Eliminated,
    EliminatedSheriff,
    EliminatedOther
);

export {
    Suspicion,
    Redness,
    RednessStrong,
    StrongSuspicion,
    Voted,
    VotedSoft,
    RequestedCheck,
    CheckedBlack,
    CheckedRed,
    Other,
    OtherSheriff,
    EliminatedAction,
    Eliminated,
    EliminatedSheriff,
    EliminatedOther
};
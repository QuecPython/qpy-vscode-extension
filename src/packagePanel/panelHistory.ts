/* save user history and steps.
return last step or return the depth of hisotry and count of saved steps */
import { log } from '../api/userInterface';
interface UserStep {
    page: string;
    submodulesUrl?: string;
    projectId?: string;
    timestamp: Date;
}

export const userSteps: UserStep[] = [];

// add a step to the history
export function addStep(page: string,  submodulesUrl?: string, projectId?: string) {
    const step: UserStep = {
        timestamp: new Date(),
        page: page,
        projectId: projectId,
        submodulesUrl: submodulesUrl
    };
    userSteps.push(step);
}

// get and remove the last step
export function getLastStep(): UserStep | undefined {
    if (userSteps.length === 0) {
        return undefined;
    }
    return userSteps.pop();
}

// get the length of the history and steps 
export function getStepsLength(): number {
    return userSteps.length;
}


// clear all steps
export function clearSteps() {
    userSteps.length = 0;
}

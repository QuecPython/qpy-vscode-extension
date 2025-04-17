import { log } from '../api/userInterface';
interface UserStep {
    page: string;
    submodulesUrl?: string;
    projectId?: string;
    timestamp: Date;
}

export const userSteps: UserStep[] = [];

// Function to add a step to the history
export function addStep(page: string,  submodulesUrl?: string, projectId?: string) {
    const step: UserStep = {
        timestamp: new Date(),
        page: page,
        projectId: projectId,
        submodulesUrl: submodulesUrl
    };
    userSteps.push(step);
}

// Function to get and remove the last step
export function getLastStep(): UserStep | undefined {
    if (userSteps.length === 0) {
        return undefined;
    }
    return userSteps.pop();
}

// Function to get the length of the steps array
export function getStepsLength(): number {
    return userSteps.length;
}


// clear all steps
export function clearSteps() {
    userSteps.length = 0;
}
    

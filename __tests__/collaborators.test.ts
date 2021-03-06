//
// Copyright © 2020 Province of British Columbia
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Created by Jason Leach on 2020-03-27.
//

import fs from 'fs';
import path from 'path';
import { Context } from 'probot';
import { assignUsersToIssue, fetchCollaborators, fetchPullRequests } from '../src/libs/ghutils';
import { addCollaboratorsToMyIssues } from '../src/libs/pullrequest';
import helper from './src/helper';

const p0 = path.join(__dirname, 'fixtures/member-added-event.json');
const memberAddedEvent = JSON.parse(fs.readFileSync(p0, 'utf8'));

const p1 = path.join(__dirname, 'fixtures/fetch-open-pulls.json');
const allOpenPulls = JSON.parse(fs.readFileSync(p1, 'utf8'));

const p2 = path.join(__dirname, 'fixtures/repo-collaborators.json');
const collaborators = JSON.parse(fs.readFileSync(p2, 'utf8'));

const p4 = path.join(__dirname, 'fixtures/issues-and-pulls.json');
const issuesAndPulls = JSON.parse(fs.readFileSync(p4, 'utf8'));

jest.mock('../src/libs/ghutils', () => ({
    fetchPullRequests: jest.fn(),
    fetchCollaborators: jest.fn(),
    assignUsersToIssue: jest.fn(),
}));

describe('Collaborator assignment to PR', () => {
    let context;
    const { github } = helper;
    const owner = 'bcgov';
    const repo = 'hello5';

    beforeEach(() => {
        context = new Context(memberAddedEvent, github as any, {} as any);
        context.payload.organization = {
            login: 'bcgov',
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('Collaborators are assigned to two open PRs', async () => {
        // @ts-ignore
        github.search.issuesAndPullRequests.mockReturnValueOnce(Promise.resolve(issuesAndPulls));

        // @ts-ignore
        fetchCollaborators.mockReturnValue(Promise.resolve(collaborators));

        await addCollaboratorsToMyIssues(context, owner, repo);

        expect(assignUsersToIssue).toBeCalledTimes(2);
    });

    it('A repo with no collaborators is skipped', async () => {
        // @ts-ignore
        fetchPullRequests.mockReturnValue(Promise.resolve(allOpenPulls));
        // @ts-ignore
        fetchCollaborators.mockReturnValue(Promise.resolve([]));

        await addCollaboratorsToMyIssues(context, owner, repo);

        expect(assignUsersToIssue).not.toBeCalled();
    });

    it('A repo with no PRs is skipped', async () => {
        // @ts-ignore
        fetchPullRequests.mockReturnValue(Promise.resolve([]));
        // @ts-ignore
        fetchCollaborators.mockReturnValue(Promise.resolve(collaborators));

        await addCollaboratorsToMyIssues(context, owner, repo);

        expect(assignUsersToIssue).not.toBeCalled();
    });

    it('A repo mismatched collaborator permissions is skipped', async () => {
        const collabs = collaborators.map(p => {
            return {
                ...p, permissions: {
                    admin: false,
                    push: false,
                    pull: true,
                },
            };
        });

        // @ts-ignore
        fetchPullRequests.mockReturnValue(Promise.resolve(allOpenPulls));
        // @ts-ignore
        fetchCollaborators.mockReturnValue(Promise.resolve(collabs));

        await addCollaboratorsToMyIssues(context, owner, repo);

        expect(assignUsersToIssue).not.toBeCalled();
    });
});

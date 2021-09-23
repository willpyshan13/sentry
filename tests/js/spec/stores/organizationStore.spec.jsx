import {updateOrganization} from 'app/actionCreators/organizations';
import OrganizationActions from 'app/actions/organizationActions';
import ProjectActions from 'app/actions/projectActions';
import OrganizationStore from 'app/stores/organizationStore';

describe('OrganizationStore', function () {
  beforeEach(function () {
    OrganizationStore.reset();
  });

  it('starts with loading state', function () {
    expect(OrganizationStore.get()).toMatchObject({
      loading: true,
      error: null,
      errorType: null,
      organization: null,
      dirty: false,
    });
  });

  it('updates correctly', async function () {
    const organization = TestStubs.Organization();
    OrganizationActions.update(organization);
    await tick();
    expect(OrganizationStore.get()).toMatchObject({
      loading: false,
      error: null,
      errorType: null,
      organization,
      dirty: false,
    });

    // updates
    organization.slug = 'a new slug';
    OrganizationActions.update(organization);
    await tick();
    expect(OrganizationStore.get()).toMatchObject({
      loading: false,
      error: null,
      errorType: null,
      organization,
      dirty: false,
    });
  });

  it('updates correctly from setting changes', async function () {
    const organization = TestStubs.Organization();
    updateOrganization(organization);
    await tick();
    expect(OrganizationStore.get()).toMatchObject({
      loading: false,
      error: null,
      errorType: null,
      organization,
      dirty: false,
    });
  });

  it('errors correctly', async function () {
    const error = new Error('uh-oh');
    error.status = 404;
    OrganizationActions.fetchOrgError(error);
    await tick();
    expect(OrganizationStore.get()).toMatchObject({
      loading: false,
      error,
      errorType: 'ORG_NOT_FOUND',
      organization: null,
      dirty: false,
    });
  });

  it('loads in sorted projects', async function () {
    const organization = TestStubs.Organization();
    OrganizationActions.update(organization);
    // wait for action to get dispatched to store
    await tick();

    const projectA = TestStubs.Project({slug: 'a'});
    const projectB = TestStubs.Project({slug: 'b'});
    const projects = [projectB, projectA];
    ProjectActions.loadProjects(projects);
    // wait for action to get dispatched to store
    await tick();

    // verify existence and sorted order of loaded projects
    expect(OrganizationStore.get().organization.projects).toEqual([projectA, projectB]);
  });
});

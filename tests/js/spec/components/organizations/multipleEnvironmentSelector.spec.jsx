import {mountWithTheme} from 'sentry-test/enzyme';

import MultipleEnvironmentSelector from 'sentry/components/organizations/multipleEnvironmentSelector';
import {ALL_ACCESS_PROJECTS} from 'sentry/constants/pageFilters';
import ConfigStore from 'sentry/stores/configStore';

describe('MultipleEnvironmentSelector', function () {
  let wrapper;
  const onChange = jest.fn();
  const onUpdate = jest.fn();

  const envs = ['production', 'staging', 'dev'];
  const projects = [
    TestStubs.Project({
      id: '1',
      slug: 'first',
      environments: ['production', 'staging'],
    }),
    TestStubs.Project({
      id: '2',
      slug: 'second',
      environments: ['dev'],
    }),
    TestStubs.Project({
      id: '3',
      slug: 'no member',
      environments: ['no-env'],
      isMember: false,
    }),
  ];
  const organization = TestStubs.Organization({projects});
  const selectedProjects = [1, 2];
  const routerContext = TestStubs.routerContext([
    {
      organization,
    },
  ]);

  beforeEach(function () {
    onChange.mockReset();
    onUpdate.mockReset();
    wrapper = mountWithTheme(
      <MultipleEnvironmentSelector
        organization={organization}
        projects={projects}
        loadingProjects={false}
        selectedProjects={selectedProjects}
        onChange={onChange}
        onUpdate={onUpdate}
      />,
      routerContext
    );
  });

  it('can select and change environments', async function () {
    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');

    // Select all envs
    envs.forEach((_env, i) => {
      wrapper
        .find('EnvironmentSelectorItem')
        .at(i)
        .find('CheckboxHitbox')
        .simulate('click', {});
    });
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith(envs);

    wrapper
      .find('MultipleSelectorSubmitRow button[aria-label="Apply"]')
      .simulate('click');
    expect(onUpdate).toHaveBeenCalledWith();
  });

  it('selects multiple environments and uses chevron to update', async function () {
    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');

    await wrapper
      .find('MultipleEnvironmentSelector AutoCompleteItem CheckboxHitbox')
      .at(0)
      .simulate('click');

    expect(onChange).toHaveBeenLastCalledWith(['production']);

    wrapper
      .find('MultipleEnvironmentSelector AutoCompleteItem CheckboxHitbox')
      .at(1)
      .simulate('click');
    expect(onChange).toHaveBeenLastCalledWith(['production', 'staging']);

    wrapper.find('MultipleEnvironmentSelector StyledChevron').simulate('click');
    expect(onUpdate).toHaveBeenCalledWith();
  });

  it('does not update when there are no changes', async function () {
    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    wrapper.find('MultipleEnvironmentSelector StyledChevron').simulate('click');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('updates environment options when projects selection changes', async function () {
    // project 2 only has 1 environment.
    wrapper.setProps({selectedProjects: [2]});
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');
    expect(items.length).toEqual(1);
    expect(items.at(0).text()).toBe('dev');
  });

  it('shows non-member project environments when selected', async function () {
    wrapper.setProps({selectedProjects: [3]});
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(1);
    expect(items.at(0).text()).toBe('no-env');
  });

  it('shows member project environments when there are no projects selected', async function () {
    wrapper.setProps({selectedProjects: []});
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });

  it('shows My Projects/all environments (superuser - no team belonging)', async function () {
    ConfigStore.config = {
      user: {
        isSuperuser: true,
      },
    };
    // "My Projects" view
    wrapper.setProps({selectedProjects: []});
    // This user is member of no project
    wrapper.setProps({
      projects: [
        TestStubs.Project({
          id: '1',
          slug: 'first',
          environments: ['production', 'staging'],
          isMember: false,
        }),
        TestStubs.Project({
          id: '2',
          slug: 'second',
          environments: ['dev'],
          isMember: false,
        }),
      ],
    });
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });

  it('shows My Projects/all environments (superuser - belongs one team)', async function () {
    // XXX: Ideally, "My Projects" and "All Projects" should be different if a superuser
    // was to belong to at least one project
    ConfigStore.config = {
      user: {
        isSuperuser: true,
      },
    };
    // "My Projects" view
    wrapper.setProps({selectedProjects: []});
    // This user is member of one project
    wrapper.setProps({
      projects: [
        TestStubs.Project({
          id: '1',
          slug: 'first',
          environments: ['production', 'staging'],
        }),
        TestStubs.Project({
          id: '2',
          slug: 'second',
          environments: ['dev'],
          isMember: false,
        }),
      ],
    });
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });

  it('shows All Projects/all environments (superuser - no team belonging)', async function () {
    ConfigStore.config = {
      user: {
        isSuperuser: true,
      },
    };
    // "All Projects" view
    wrapper.setProps({selectedProjects: [-1]});
    // This user is member of one project
    wrapper.setProps({
      projects: [
        TestStubs.Project({
          id: '1',
          slug: 'first',
          environments: ['production', 'staging'],
        }),
        TestStubs.Project({
          id: '2',
          slug: 'second',
          environments: ['dev'],
          isMember: false,
        }),
      ],
    });
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });

  it('shows All Projects/all environments (superuser - belongs one team)', async function () {
    // XXX: Ideally, "My Projects" and "All Projects" should be different if a superuser
    // was to belong to at least one project
    ConfigStore.config = {
      user: {
        isSuperuser: true,
      },
    };
    // "All Projects" view
    wrapper.setProps({selectedProjects: [-1]});
    // This user is member of one project
    wrapper.setProps({
      projects: [
        TestStubs.Project({
          id: '1',
          slug: 'first',
          environments: ['production', 'staging'],
        }),
        TestStubs.Project({
          id: '2',
          slug: 'second',
          environments: ['dev'],
          isMember: false,
        }),
      ],
    });
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });

  it('shows all project environments when "all projects" is selected', async function () {
    wrapper.setProps({selectedProjects: [ALL_ACCESS_PROJECTS]});
    wrapper.update();

    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(4);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
    expect(items.at(3).text()).toBe('no-env');
  });

  it('shows the distinct union of environments across all projects', async function () {
    wrapper.setProps({selectedProjects: [1, 2]});
    await wrapper.find('MultipleEnvironmentSelector HeaderItem').simulate('click');
    const items = wrapper.find('MultipleEnvironmentSelector GlobalSelectionHeaderRow');

    expect(items.length).toEqual(3);
    expect(items.at(0).text()).toBe('production');
    expect(items.at(1).text()).toBe('staging');
    expect(items.at(2).text()).toBe('dev');
  });
});

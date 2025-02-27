import {Client} from 'sentry/api';

type PromptsUpdateParams = {
  /**
   * The numeric organization ID as a string
   */
  organizationId: string;
  /**
   * The numeric project ID as a string
   */
  projectId?: string;
  /**
   * The prompt feature name
   */
  feature: string;
  status: 'snoozed' | 'dismissed';
};

/**
 * Update the status of a prompt
 */
export function promptsUpdate(api: Client, params: PromptsUpdateParams) {
  return api.requestPromise('/prompts-activity/', {
    method: 'PUT',
    data: {
      organization_id: params.organizationId,
      project_id: params.projectId,
      feature: params.feature,
      status: params.status,
    },
  });
}

type PromptCheckParams = {
  /**
   * The numeric organization ID as a string
   */
  organizationId: string;
  /**
   * The numeric project ID as a string
   */
  projectId?: string;
  /**
   * The prompt feature name
   */
  feature: string;
};

export type PromptResponseItem = {
  snoozed_ts?: number;
  dismissed_ts?: number;
};
export type PromptResponse = {
  data?: PromptResponseItem;
  features?: {[key: string]: PromptResponseItem};
};

export type PromptData = null | {
  dismissedTime?: number;
  snoozedTime?: number;
};

/**
 * Get the status of a prompt
 */
export async function promptsCheck(
  api: Client,
  params: PromptCheckParams
): Promise<PromptData> {
  const query = {
    feature: params.feature,
    organization_id: params.organizationId,
    ...(params.projectId === undefined ? {} : {project_id: params.projectId}),
  };

  const response: PromptResponse = await api.requestPromise('/prompts-activity/', {
    query,
  });

  const data = response?.data;

  if (!data) {
    return null;
  }

  return {
    dismissedTime: data.dismissed_ts,
    snoozedTime: data.snoozed_ts,
  };
}

/**
 * Get the status of many prompt
 */
export async function batchedPromptsCheck<T extends readonly string[]>(
  api: Client,
  features: T,
  params: {organizationId: string; projectId?: string}
): Promise<{[key in T[number]]: PromptData}> {
  const query = {
    feature: features,
    organization_id: params.organizationId,
    ...(params.projectId === undefined ? {} : {project_id: params.projectId}),
  };

  const response: PromptResponse = await api.requestPromise('/prompts-activity/', {
    query,
  });
  const responseFeatures = response?.features;

  const result: {[key in T[number]]?: PromptData} = {};
  if (!responseFeatures) {
    return result as {[key in T[number]]: PromptData};
  }
  for (const featureName of features) {
    const item = responseFeatures[featureName];
    if (item) {
      result[featureName] = {
        dismissedTime: item.dismissed_ts,
        snoozedTime: item.snoozed_ts,
      };
    } else {
      result[featureName] = null;
    }
  }
  return result as {[key in T[number]]: PromptData};
}

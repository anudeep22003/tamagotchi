import { z } from "zod";
import axios from "axios";

export const githubUrlSchema = z
  .url("Must be a valid URL")
  .regex(
    /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/,
    "Must be a GitHub repository URL (github.com/owner/repo)"
  );

export type ValidationState = {
  isValidUrl: boolean | null;
  isGithubUrl: boolean | null;
  isPublicRepo: boolean | null;
};

export type ValidationStatus =
  | "valid"
  | "invalid"
  | "neutral"
  | "checking";

export const validateUrl = (
  url: string
): { isValidUrl: boolean; isGithubUrl: boolean } => {
  if (!url.trim()) {
    return { isValidUrl: false, isGithubUrl: false };
  }

  // Check if it's a valid URL
  try {
    new URL(url);
  } catch {
    return { isValidUrl: false, isGithubUrl: false };
  }

  const isValidUrl = true;

  // Check if it matches GitHub repository pattern
  const githubResult = githubUrlSchema.safeParse(url);
  const isGithubUrl = githubResult.success;

  return { isValidUrl, isGithubUrl };
};

export const checkRepoVisibility = async (
  url: string
): Promise<boolean> => {
  try {
    // Extract owner/repo from URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return false;

    const [, owner, repo] = match;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo.replace(
      /\.git$/,
      ""
    )}`;

    // Make a HEAD request to check if repo is publicly accessible
    const response = await axios.head(apiUrl, {
      timeout: 5000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // If we get 200, it's public
    // If we get 404, it's either private or doesn't exist
    return response.status === 200;
  } catch (error) {
    // If there's any error (network, timeout, etc.), assume it's not accessible
    console.error(error);
    return false;
  }
};

export const getValidationStatus = (
  state: ValidationState,
  checking: boolean
): {
  validUrl: ValidationStatus;
  githubUrl: ValidationStatus;
  publicRepo: ValidationStatus;
} => {
  const getStatus = (
    value: boolean | null,
    isCheckingThis: boolean
  ): ValidationStatus => {
    if (isCheckingThis) return "checking";
    if (value === null) return "neutral";
    return value ? "valid" : "invalid";
  };

  return {
    validUrl: getStatus(state.isValidUrl, false), // URL validation is synchronous
    githubUrl: getStatus(state.isGithubUrl, false), // GitHub URL validation is synchronous
    publicRepo: getStatus(state.isPublicRepo, checking), // Only public repo check can be in 'checking' state
  };
};

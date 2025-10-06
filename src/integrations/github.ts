import fetch from 'node-fetch';
import { Logger } from '../utils/logger';

export interface GitHubIssue {
  id: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubPR {
  id: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export class GitHubIntegration {
  private logger: Logger;
  private baseUrl: string;
  private token?: string;

  constructor() {
    this.logger = new Logger();
    this.baseUrl = 'https://api.github.com';
  }

  async initialize() {
    this.token = process.env.GITHUB_TOKEN;
    this.logger.info('GitHub integration initialized');
  }

  async getIssues(repo: string, state: string = 'open'): Promise<GitHubIssue[]> {
    try {
      const url = `${this.baseUrl}/repos/${repo}/issues?state=${state}&sort=updated&per_page=10`;
      const headers = this.getHeaders();
      
      const response = await fetch(url, { headers });
      const issues = await response.json();
      
      return issues.map((issue: any) => ({
        id: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to fetch GitHub issues:', error);
      return [];
    }
  }

  async getPullRequests(repo: string, state: string = 'open'): Promise<GitHubPR[]> {
    try {
      const url = `${this.baseUrl}/repos/${repo}/pulls?state=${state}&sort=updated&per_page=10`;
      const headers = this.getHeaders();
      
      const response = await fetch(url, { headers });
      const prs = await response.json();
      
      return prs.map((pr: any) => ({
        id: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to fetch GitHub pull requests:', error);
      return [];
    }
  }

  async getCommits(repo: string, limit: number = 10): Promise<GitHubCommit[]> {
    try {
      const url = `${this.baseUrl}/repos/${repo}/commits?per_page=${limit}`;
      const headers = this.getHeaders();
      
      const response = await fetch(url, { headers });
      const commits = await response.json();
      
      return commits.map((commit: any) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        date: commit.commit.author.date
      }));
    } catch (error) {
      this.logger.error('Failed to fetch GitHub commits:', error);
      return [];
    }
  }

  async getRepositoryInfo(repo: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/repos/${repo}`;
      const headers = this.getHeaders();
      
      const response = await fetch(url, { headers });
      const repoInfo = await response.json();
      
      return {
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        issues: repoInfo.open_issues_count,
        language: repoInfo.language,
        updatedAt: repoInfo.updated_at
      };
    } catch (error) {
      this.logger.error('Failed to fetch repository info:', error);
      return null;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'gunnchAI3k/1.0'
    };
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    
    return headers;
  }
}

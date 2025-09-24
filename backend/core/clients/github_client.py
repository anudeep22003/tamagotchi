from github import Auth, Github

from core.config import GITHUB_TOKEN

auth = Auth.Token(GITHUB_TOKEN)
github = Github(auth=auth)


def get_github_client() -> Github:
    return github

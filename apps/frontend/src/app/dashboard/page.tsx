'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  GitBranch, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Github,
  Plus,
  Trash2,
  Edit
} from 'lucide-react'

interface Repository {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string
  default_branch: string
  permissions: {
    admin: boolean
    push: boolean
    pull: boolean
  }
}

interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: any
  actions: any
}

export default function Dashboard() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleForm, setShowRuleForm] = useState(false)

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    try {
      const response = await fetch('/api/github/repositories')
      if (response.ok) {
        const data = await response.json()
        setRepositories(data)
        if (data.length > 0) {
          setSelectedRepo(data[0])
          fetchRules(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRules = async (repoId: number) => {
    try {
      const response = await fetch(`/api/rules/repository/${repoId}`)
      if (response.ok) {
        const data = await response.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    }
  }

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo)
    fetchRules(repo.id)
  }

  const handleInstallApp = async (repo: Repository) => {
    try {
      // This would redirect to GitHub App installation
      window.open(`https://github.com/apps/automerge-pro/installations/new`, '_blank')
    } catch (error) {
      console.error('Error installing app:', error)
    }
  }

  const handleCreateRule = () => {
    setShowRuleForm(true)
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setRules(rules.filter(rule => rule.id !== ruleId))
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your repositories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <GitBranch className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">AutoMerge Pro Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Repositories List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Repositories</span>
                  <Badge variant="secondary">{repositories.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Select a repository to manage automerge rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRepo?.id === repo.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRepoSelect(repo)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {repo.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {repo.full_name}
                        </p>
                        {repo.private && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Private
                          </Badge>
                        )}
                      </div>
                      <div className="ml-2">
                        {repo.permissions.admin ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Rules Management */}
          <div className="lg:col-span-2">
            {selectedRepo ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>AutoMerge Rules</span>
                        <Badge variant="outline">{selectedRepo.name}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Configure automerge rules for {selectedRepo.full_name}
                      </CardDescription>
                    </div>
                    <Button onClick={handleCreateRule} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rules.length === 0 ? (
                    <div className="text-center py-8">
                      <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No rules configured
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Create your first automerge rule to get started
                      </p>
                      <Button onClick={handleCreateRule}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Rule
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rules.map((rule) => (
                        <div
                          key={rule.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900">{rule.name}</h4>
                              <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{rule.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a repository
                  </h3>
                  <p className="text-gray-500">
                    Choose a repository from the list to manage automerge rules
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Merged Today</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Rules</p>
                  <p className="text-2xl font-bold text-gray-900">{rules.filter(r => r.enabled).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg. Merge Time</p>
                  <p className="text-2xl font-bold text-gray-900">2.3m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
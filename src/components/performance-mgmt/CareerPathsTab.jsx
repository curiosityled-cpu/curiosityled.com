import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase, GitBranch, Pencil, Grid3x3, List, Search, Upload, Download, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import RoleModal from "@/components/careerpath/RoleModal";
import CareerPathModal from "@/components/careerpath/CareerPathModal";

export default function CareerPathsTab({ user }) {
  const [roles, setRoles] = useState([]);
  const [careerPaths, setCareerPaths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roles');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);

  const uploadInputRef = useRef(null);
  const deleteInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [rolesView, setRolesView] = useState('cards');
  const [pathsView, setPathsView] = useState('cards');
  const [rolesSortBy, setRolesSortBy] = useState('title');
  const [pathsSortBy, setPathsSortBy] = useState('title');
  const [rolesFilterDept, setRolesFilterDept] = useState('all');
  const [rolesFilterLevel, setRolesFilterLevel] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [rolesData, pathsData] = await Promise.all([
        base44.entities.Role.list(),
        base44.entities.CareerPath.list()
      ]);
      setRoles(rolesData);
      setCareerPaths(pathsData);
    } catch (error) {
      toast.error('Failed to load career path data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0202ff]" /></div>;
  }

  const openRoleModal = (role = null) => { setSelectedRole(role); setShowRoleModal(true); };
  const openPathModal = (path = null) => { setSelectedPath(path); setShowPathModal(true); };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv_data = e.target.result;
      try {
        const response = await base44.functions.invoke('bulkRoleOperations', { operation: 'upload', csv_data });
        toast.success(`Successfully uploaded ${response.results.filter(r => r.success).length} roles`);
        loadData();
      } catch (error) { toast.error(error.message || 'Failed to upload roles'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleCSVDelete = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('Are you sure you want to delete roles listed in this CSV?')) { event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csv_data = e.target.result;
      try {
        const response = await base44.functions.invoke('bulkRoleOperations', { operation: 'delete', csv_data });
        toast.success(`Successfully deleted ${response.results.filter(r => r.success).length} roles`);
        loadData();
      } catch (error) { toast.error(error.message || 'Failed to delete roles'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const downloadCSVTemplate = () => {
    const template = `title,level,department,job_summary,business_value,essential_duties,required_qualifications,preferred_qualifications,technical_competencies,behavioral_competencies,reporting_structure,work_environment,tools_and_systems,flsa_status,compensation_range,benefits_highlights,success_metrics,eeo_statement,legal_disclaimers,is_active
Senior Product Manager,leading_others,product,"Lead product strategy and cross-functional teams to deliver innovative solutions that drive business growth and customer satisfaction.","Drive $10M+ in annual product revenue through strategic feature development and market expansion.","Define product roadmap and vision|Lead cross-functional teams (Engineering, Design, Marketing)|Analyze market trends and customer feedback|Prioritize features based on impact and feasibility|Drive product launches and go-to-market strategies|Monitor KPIs and iterate based on data","education:Bachelor's in Business or Computer Science|experience_years:5|technical_skills:Product Management;Data Analysis;Agile|certifications:Certified Scrum Product Owner","education:MBA|experience_years:7|technical_skills:SQL;Analytics Tools;UX Design|certifications:Product Management Certification","Strategic Thinking:85:1.5|Decision-Making:80:1|Innovation & Creativity:85:1.2","Communication:85:1.5|Stakeholder Management:80:1.3|Team Collaboration:75:1","reports_to:VP of Product|direct_reports:2|dotted_line_reports:Engineering Team;Design Team|key_collaborations:Sales;Marketing;Customer Success","location_type:hybrid|physical_office_location:San Francisco, CA|travel_percentage:15|physical_requirements:Standard office environment|working_conditions:Fast-paced startup environment","Jira;Figma;Google Analytics;Slack;Confluence",exempt,"min_salary:120000|max_salary:160000|currency:USD|bonus_structure:15% annual bonus|equity:Stock options","Health Insurance|401k Match|Unlimited PTO|Professional Development Budget|Remote Work Flexibility","Product adoption rate >50%|Customer satisfaction score >4.5/5|Feature delivery on schedule >90%|Revenue impact of new features","We are an equal opportunity employer and value diversity at our company.","This is an at-will employment position.",true`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'role_template.csv'; document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); a.remove();
    toast.success('Role CSV template downloaded');
  };

  const getFilteredAndSortedRoles = () => {
    let filtered = [...roles];
    if (searchTerm) filtered = filtered.filter(r => r.title?.toLowerCase().includes(searchTerm.toLowerCase()) || r.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (rolesFilterDept !== 'all') filtered = filtered.filter(r => r.department === rolesFilterDept);
    if (rolesFilterLevel !== 'all') filtered = filtered.filter(r => r.level === rolesFilterLevel);
    filtered.sort((a, b) => {
      if (rolesSortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (rolesSortBy === 'level') return (a.level || '').localeCompare(b.level || '');
      if (rolesSortBy === 'department') return (a.department || '').localeCompare(b.department || '');
      return 0;
    });
    return filtered;
  };

  const getFilteredAndSortedPaths = () => {
    let filtered = [...careerPaths];
    if (searchTerm) filtered = filtered.filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()) || p.brief_description?.toLowerCase().includes(searchTerm.toLowerCase()));
    filtered.sort((a, b) => {
      if (pathsSortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (pathsSortBy === 'duration') return (a.typical_duration_months || 0) - (b.typical_duration_months || 0);
      if (pathsSortBy === 'difficulty') return (a.difficulty_level || '').localeCompare(b.difficulty_level || '');
      return 0;
    });
    return filtered;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('roles')} className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'roles' ? 'text-[#0202ff] border-b-2 border-[#0202ff]' : 'text-gray-600 hover:text-gray-900'}`}>
          <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Roles ({roles.length})</div>
        </button>
        <button onClick={() => setActiveTab('paths')} className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'paths' ? 'text-[#0202ff] border-b-2 border-[#0202ff]' : 'text-gray-600 hover:text-gray-900'}`}>
          <div className="flex items-center gap-2"><GitBranch className="w-4 h-4" /> Career Paths ({careerPaths.length})</div>
        </button>
      </div>

      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h3 className="text-base font-semibold text-gray-900">Organizational Roles</h3>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={downloadCSVTemplate}><Download className="w-4 h-4 mr-1.5" /> CSV Template</Button>
              <Button variant="outline" size="sm" onClick={() => uploadInputRef.current?.click()}><Upload className="w-4 h-4 mr-1.5" /> Bulk Upload</Button>
              <Button variant="outline" size="sm" onClick={() => deleteInputRef.current?.click()}><Trash2 className="w-4 h-4 mr-1.5" /> Bulk Delete</Button>
              <Button size="sm" className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => openRoleModal()}><Plus className="w-4 h-4 mr-1.5" /> Add New Role</Button>
              <input ref={uploadInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              <input ref={deleteInputRef} type="file" accept=".csv" onChange={handleCSVDelete} className="hidden" />
            </div>
          </div>

          <Card className="border border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search roles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={rolesFilterDept} onValueChange={setRolesFilterDept}>
                  <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {["operations","sales","product","technology","finance","hr","marketing","corporate"].map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={rolesFilterLevel} onValueChange={setRolesFilterLevel}>
                  <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {["leading_self","leading_others","leading_managers","leading_functions","leading_organizations"].map(l => <SelectItem key={l} value={l}>{l.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={rolesSortBy} onValueChange={setRolesSortBy}>
                  <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent><SelectItem value="title">Title</SelectItem><SelectItem value="level">Level</SelectItem><SelectItem value="department">Department</SelectItem></SelectContent>
                </Select>
                <div className="flex gap-1 border rounded-md">
                  <Button variant={rolesView === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setRolesView('cards')}><Grid3x3 className="w-4 h-4" /></Button>
                  <Button variant={rolesView === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setRolesView('list')}><List className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {getFilteredAndSortedRoles().length === 0 ? (
            <Card className="border border-gray-100 shadow-sm rounded-xl"><CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-semibold mb-1">No Roles Defined Yet</h3>
              <p className="text-sm text-gray-500 mb-4">Start by creating your first organizational role.</p>
              <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => openRoleModal()}><Plus className="w-4 h-4 mr-1.5" /> Create First Role</Button>
            </CardContent></Card>
          ) : rolesView === 'cards' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredAndSortedRoles().map((role, i) => (
                <motion.div key={role.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => openRoleModal(role)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-sm mb-2">{role.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-[10px]">{role.department}</Badge>
                            <Badge className="text-[10px] bg-blue-100 text-blue-800">{role.level?.replace(/_/g,' ')}</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openRoleModal(role); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-600 mb-3 line-clamp-3">{role.description}</p>
                      <div className="text-xs space-y-1">
                        <div><span className="font-medium">Required Competencies:</span> <span className="text-gray-600 ml-1">{role.required_competencies?.length || 0}</span></div>
                        <div><span className="font-medium">Experience:</span> <span className="text-gray-600 ml-1">{role.typical_experience_years}+ years</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="border border-gray-100 shadow-sm rounded-xl">
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {getFilteredAndSortedRoles().map((role, i) => (
                    <motion.div key={role.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => openRoleModal(role)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-sm">{role.title}</h3>
                          <Badge variant="outline" className="text-[10px]">{role.department}</Badge>
                          <Badge className="text-[10px] bg-blue-100 text-blue-800">{role.level?.replace(/_/g,' ')}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{role.description}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openRoleModal(role); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'paths' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">Career Progression Paths</h3>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openPathModal()}><Plus className="w-4 h-4 mr-1.5" /> Add New Path</Button>
          </div>

          <Card className="border border-gray-100 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search career paths..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>
                <Select value={pathsSortBy} onValueChange={setPathsSortBy}>
                  <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent><SelectItem value="title">Title</SelectItem><SelectItem value="duration">Duration</SelectItem><SelectItem value="difficulty">Difficulty</SelectItem></SelectContent>
                </Select>
                <div className="flex gap-1 border rounded-md">
                  <Button variant={pathsView === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setPathsView('cards')}><Grid3x3 className="w-4 h-4" /></Button>
                  <Button variant={pathsView === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setPathsView('list')}><List className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {getFilteredAndSortedPaths().length === 0 ? (
            <Card className="border border-gray-100 shadow-sm rounded-xl"><CardContent className="p-12 text-center">
              <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-semibold mb-1">No Career Paths Defined Yet</h3>
              <p className="text-sm text-gray-500 mb-4">Create career progression paths between roles.</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openPathModal()}><Plus className="w-4 h-4 mr-1.5" /> Create First Path</Button>
            </CardContent></Card>
          ) : pathsView === 'list' ? (
            <div className="space-y-3">
              {getFilteredAndSortedPaths().map((path, i) => (
                <motion.div key={path.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPathModal(path)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-sm">{path.from_role_id}</h3>
                            <span className="text-gray-400">→</span>
                            <h3 className="font-semibold text-sm">{path.to_role_id}</h3>
                            <Badge className={`text-[10px] ${path.path_type === 'vertical' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{path.path_type}</Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{path.brief_description}</p>
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>Duration: {path.typical_duration_months} months</span><span>•</span>
                            <span>Difficulty: {path.difficulty_level}</span><span>•</span>
                            <span>Competencies: {path.core_competencies?.length || 0}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openPathModal(path); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {getFilteredAndSortedPaths().map((path, i) => (
                <motion.div key={path.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border border-gray-100 shadow-sm rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPathModal(path)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-sm">{path.title}</CardTitle>
                            <Badge className={`text-[10px] ${path.path_type === 'vertical' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{path.path_type}</Badge>
                          </div>
                          <p className="text-xs text-gray-600">{path.brief_description}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openPathModal(path); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>Duration: {path.typical_duration_months} months</span><span>•</span>
                        <span>Difficulty: {path.difficulty_level}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <RoleModal role={selectedRole} isOpen={showRoleModal} onClose={() => { setShowRoleModal(false); setSelectedRole(null); }} onSave={loadData} />
      <CareerPathModal path={selectedPath} roles={roles} isOpen={showPathModal} onClose={() => { setShowPathModal(false); setSelectedPath(null); }} onSave={loadData} />
    </div>
  );
}
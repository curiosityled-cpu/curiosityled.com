import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Briefcase, GitBranch, Pencil, Grid3x3, List, Search, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import RoleModal from "@/components/careerpath/RoleModal";
import CareerPathModal from "@/components/careerpath/CareerPathModal";

const SUB_SECTIONS = [
  { id: 'roles', label: 'Roles', icon: Briefcase },
  { id: 'paths', label: 'Career Paths', icon: GitBranch },
];

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
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#0202ff]" /></div>;
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
    <div className="space-y-4">
      {/* Sub-section toggle */}
      <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {SUB_SECTIONS.map(sub => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => { setActiveTab(sub.id); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg transition-all whitespace-nowrap ${
                activeTab === sub.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {sub.label}
              <span className="text-gray-400">({sub.id === 'roles' ? roles.length : careerPaths.length})</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Roles', value: roles.length, color: 'text-[#0202ff]' },
              { label: 'Departments', value: [...new Set(roles.map(r => r.department).filter(Boolean))].length, color: 'text-purple-600' },
              { label: 'Active', value: roles.filter(r => r.is_active !== false).length, color: 'text-green-600' },
            ].map(s => (
              <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search roles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={downloadCSVTemplate}><Download className="w-3.5 h-3.5 mr-1" /> Template</Button>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => uploadInputRef.current?.click()}><Upload className="w-3.5 h-3.5 mr-1" /> Upload</Button>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => deleteInputRef.current?.click()}><Trash2 className="w-3.5 h-3.5 mr-1" /> Bulk Delete</Button>
              <Button size="sm" className="h-9 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => openRoleModal()}><Plus className="w-3.5 h-3.5 mr-1" /> Add Role</Button>
              <input ref={uploadInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              <input ref={deleteInputRef} type="file" accept=".csv" onChange={handleCSVDelete} className="hidden" />
            </div>
          </div>

          {/* Secondary filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={rolesFilterDept} onValueChange={setRolesFilterDept}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {["operations","sales","product","technology","finance","hr","marketing","corporate"].map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rolesFilterLevel} onValueChange={setRolesFilterLevel}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {["leading_self","leading_others","leading_managers","leading_functions","leading_organizations"].map(l => <SelectItem key={l} value={l}>{l.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={rolesSortBy} onValueChange={setRolesSortBy}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent><SelectItem value="title">Title</SelectItem><SelectItem value="level">Level</SelectItem><SelectItem value="department">Department</SelectItem></SelectContent>
            </Select>
            <div className="flex gap-1 border border-gray-100 rounded-lg p-0.5">
              <Button variant={rolesView === 'cards' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setRolesView('cards')}><Grid3x3 className="w-3.5 h-3.5" /></Button>
              <Button variant={rolesView === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setRolesView('list')}><List className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          {/* Role cards/list */}
          {getFilteredAndSortedRoles().length === 0 ? (
            <Card className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-8 text-center">
                <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">No roles found</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">{searchTerm ? "Try a different search term." : "Start by creating your first organizational role."}</p>
                {!searchTerm && <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs" onClick={() => openRoleModal()}><Plus className="w-4 h-4 mr-1" /> Create First Role</Button>}
              </CardContent>
            </Card>
          ) : rolesView === 'cards' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getFilteredAndSortedRoles().map((role, i) => (
                <motion.div key={role.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer h-full" onClick={() => openRoleModal(role)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 mb-1.5 truncate">{role.title}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{role.department}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{role.level?.replace(/_/g,' ')}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={e => { e.stopPropagation(); openRoleModal(role); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                      {role.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{role.description}</p>}
                      <div className="text-xs space-y-1 pt-2 border-t border-gray-100">
                        <div className="flex justify-between"><span className="text-gray-500">Competencies</span><span className="font-medium text-gray-700">{role.required_competencies?.length || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Experience</span><span className="font-medium text-gray-700">{role.typical_experience_years || 0}+ years</span></div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-0">
                <div className="divide-y divide-gray-50">
                  {getFilteredAndSortedRoles().map((role, i) => (
                    <motion.div key={role.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="p-3.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => openRoleModal(role)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium text-sm text-gray-900">{role.title}</p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{role.department}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{role.level?.replace(/_/g,' ')}</span>
                        </div>
                        {role.description && <p className="text-xs text-gray-500 line-clamp-1">{role.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={e => { e.stopPropagation(); openRoleModal(role); }}><Pencil className="w-3.5 h-3.5" /></Button>
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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Paths', value: careerPaths.length, color: 'text-[#0202ff]' },
              { label: 'Vertical', value: careerPaths.filter(p => p.path_type === 'vertical').length, color: 'text-green-600' },
              { label: 'Lateral', value: careerPaths.filter(p => p.path_type === 'lateral').length, color: 'text-blue-600' },
            ].map(s => (
              <Card key={s.label} className="shadow-sm border border-gray-100 rounded-2xl">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters + Create */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search career paths..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={pathsSortBy} onValueChange={setPathsSortBy}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent><SelectItem value="title">Title</SelectItem><SelectItem value="duration">Duration</SelectItem><SelectItem value="difficulty">Difficulty</SelectItem></SelectContent>
              </Select>
              <div className="flex gap-1 border border-gray-100 rounded-lg p-0.5">
                <Button variant={pathsView === 'cards' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setPathsView('cards')}><Grid3x3 className="w-3.5 h-3.5" /></Button>
                <Button variant={pathsView === 'list' ? 'default' : 'ghost'} size="sm" className="h-7 w-7 p-0" onClick={() => setPathsView('list')}><List className="w-3.5 h-3.5" /></Button>
              </div>
              <Button size="sm" className="h-9 text-xs bg-[#0202ff] hover:bg-[#0101dd] text-white" onClick={() => openPathModal()}><Plus className="w-3.5 h-3.5 mr-1" /> Add Path</Button>
            </div>
          </div>

          {/* Path cards/list */}
          {getFilteredAndSortedPaths().length === 0 ? (
            <Card className="shadow-sm border border-gray-100 rounded-2xl">
              <CardContent className="p-8 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-800">No career paths found</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">{searchTerm ? "Try a different search term." : "Create career progression paths between roles."}</p>
                {!searchTerm && <Button className="bg-[#0202ff] hover:bg-[#0101dd] text-white h-9 text-xs" onClick={() => openPathModal()}><Plus className="w-4 h-4 mr-1" /> Create First Path</Button>}
              </CardContent>
            </Card>
          ) : pathsView === 'list' ? (
            <div className="space-y-2">
              {getFilteredAndSortedPaths().map((path, i) => (
                <motion.div key={path.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPathModal(path)}>
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm text-gray-900">{path.from_role_id}</p>
                            <span className="text-gray-400 text-xs">→</span>
                            <p className="font-medium text-sm text-gray-900">{path.to_role_id}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${path.path_type === 'vertical' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{path.path_type}</span>
                          </div>
                          {path.brief_description && <p className="text-xs text-gray-500 line-clamp-1 mb-1.5">{path.brief_description}</p>}
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>{path.typical_duration_months} months</span>
                            <span>•</span>
                            <span>{path.difficulty_level}</span>
                            <span>•</span>
                            <span>{path.core_competencies?.length || 0} competencies</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={e => { e.stopPropagation(); openPathModal(path); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {getFilteredAndSortedPaths().map((path, i) => (
                <motion.div key={path.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition-shadow cursor-pointer h-full" onClick={() => openPathModal(path)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 mb-1">{path.title}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${path.path_type === 'vertical' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{path.path_type}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={e => { e.stopPropagation(); openPathModal(path); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      </div>
                      {path.brief_description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{path.brief_description}</p>}
                      <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>{path.typical_duration_months} months</span>
                        <span>•</span>
                        <span>{path.difficulty_level}</span>
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
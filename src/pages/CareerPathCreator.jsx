import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Briefcase, GitBranch, BookOpen, Users, Pencil, Trash2, Grid3x3, List, Search, Upload, Download, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { withAuthProtection } from "@/components/hoc/withAuthProtection";
import RoleModal from "@/components/careerpath/RoleModal";
import CareerPathModal from "@/components/careerpath/CareerPathModal";
import CompetencyModal from "@/components/careerpath/CompetencyModal";
import { Toaster, toast } from "sonner";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import FormAssistant from "@/components/ai/FormAssistant";

function CareerPathCreator() {
    const [roles, setRoles] = useState([]);
    const [careerPaths, setCareerPaths] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('roles');
    
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showPathModal, setShowPathModal] = useState(false);
    const [showCompetencyModal, setShowCompetencyModal] = useState(false);
    
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPath, setSelectedPath] = useState(null);
    const [selectedCompetency, setSelectedCompetency] = useState(null);
    
    const uploadInputRef = useRef(null);
    const deleteInputRef = useRef(null);
    const compUploadInputRef = useRef(null);
    const compDeleteInputRef = useRef(null);
    
    // Filter, sort, and view state
    const [searchTerm, setSearchTerm] = useState('');
    const [rolesView, setRolesView] = useState('cards');
    const [pathsView, setPathsView] = useState('cards');
    const [competenciesView, setCompetenciesView] = useState('cards');
    const [rolesSortBy, setRolesSortBy] = useState('title');
    const [pathsSortBy, setPathsSortBy] = useState('title');
    const [competenciesSortBy, setCompetenciesSortBy] = useState('name');
    const [rolesFilterDept, setRolesFilterDept] = useState('all');
    const [rolesFilterLevel, setRolesFilterLevel] = useState('all');
    const [competenciesFilterCategory, setCompetenciesFilterCategory] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            console.log('CareerPathCreator: Starting data load...');
            
            const [rolesData, pathsData, competenciesData] = await Promise.all([
                base44.entities.Role.list(),
                base44.entities.CareerPath.list(),
                base44.entities.Competency.list()
            ]);

            console.log('CareerPathCreator: Data loaded:', {
                roles: rolesData.length,
                careerPaths: pathsData.length,
                competencies: competenciesData.length
            });

            setRoles(rolesData);
            setCareerPaths(pathsData);
            setCompetencies(competenciesData);
            
            setError(null);
        } catch (error) {
            console.error('CareerPathCreator: Error loading data:', error);
            setError(error.message || 'Failed to load career path data');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Career Path Creator...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
                <Card className="max-w-md">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Career Path Creator</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="flex gap-3">
                            <Button onClick={loadData}>Try Again</Button>
                            <Button variant="outline" onClick={() => base44.auth.redirectToLogin()}>Login</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const openRoleModal = (role = null) => {
        setSelectedRole(role);
        setShowRoleModal(true);
    };

    const openPathModal = (path = null) => {
        setSelectedPath(path);
        setShowPathModal(true);
    };

    const openCompetencyModal = (competency = null) => {
        setSelectedCompetency(competency);
        setShowCompetencyModal(true);
    };

    const handleCSVUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csv_data = e.target.result;
            try {
                const response = await base44.functions.invoke('bulkRoleOperations', {
                    operation: 'upload',
                    csv_data
                });
                toast.success(`Successfully uploaded ${response.results.filter(r => r.success).length} roles`);
                loadData();
            } catch (error) {
                console.error('Upload error:', error);
                toast.error(error.message || 'Failed to upload roles');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleCSVDelete = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Are you sure you want to delete roles listed in this CSV?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csv_data = e.target.result;
            try {
                const response = await base44.functions.invoke('bulkRoleOperations', {
                    operation: 'delete',
                    csv_data
                });
                toast.success(`Successfully deleted ${response.results.filter(r => r.success).length} roles`);
                loadData();
            } catch (error) {
                console.error('Delete error:', error);
                toast.error(error.message || 'Failed to delete roles');
            }
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
        a.href = url;
        a.download = 'role_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Role CSV template downloaded');
    };

    const handleCompetencyCSVUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csv_data = e.target.result;
            try {
                const response = await base44.functions.invoke('bulkCompetencyOperations', {
                    operation: 'upload',
                    csv_data
                });
                toast.success(`Successfully uploaded ${response.results.filter(r => r.success).length} competencies`);
                loadData();
            } catch (error) {
                console.error('Upload error:', error);
                toast.error(error.message || 'Failed to upload competencies');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleCompetencyCSVDelete = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Are you sure you want to delete competencies listed in this CSV?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csv_data = e.target.result;
            try {
                const response = await base44.functions.invoke('bulkCompetencyOperations', {
                    operation: 'delete',
                    csv_data
                });
                toast.success(`Successfully deleted ${response.results.filter(r => r.success).length} competencies`);
                loadData();
            } catch (error) {
                console.error('Delete error:', error);
                toast.error(error.message || 'Failed to delete competencies');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const downloadCompetencyCSVTemplate = () => {
        const template = `name,category,definition,key_components,leadership_level_requirements,evidence_base,assessment_mapping,is_platform_default
Strategic Thinking,Tactical,"Ability to analyze complex situations and develop long-term plans that align with organizational goals.","Planning & prioritization:35|Systems thinking:28|Long-term vision:22|Risk assessment:15","1:2|2:3|3:4|4:5|5:5","Research shows strategic thinking correlates with organizational success. Studies demonstrate planning and systems thinking as primary factors in effective strategy execution.","assessment_ids:|score_mapping:0-59: Development Needed, 60-74: Developing, 75-89: Proficient, 90-100: Advanced|calculation_method:Individual competency scored on 0-100 scale based on response patterns from Leadership Index Assessment scenarios.",true`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'competency_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Competency CSV template downloaded');
    };

    // Filter and sort functions
    const getFilteredAndSortedRoles = () => {
        let filtered = [...roles];
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(role => 
                role.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                role.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Department filter
        if (rolesFilterDept !== 'all') {
            filtered = filtered.filter(role => role.department === rolesFilterDept);
        }
        
        // Level filter
        if (rolesFilterLevel !== 'all') {
            filtered = filtered.filter(role => role.level === rolesFilterLevel);
        }
        
        // Sort
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
        
        if (searchTerm) {
            filtered = filtered.filter(path => 
                path.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                path.brief_description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        filtered.sort((a, b) => {
            if (pathsSortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            if (pathsSortBy === 'duration') return (a.typical_duration_months || 0) - (b.typical_duration_months || 0);
            if (pathsSortBy === 'difficulty') return (a.difficulty_level || '').localeCompare(b.difficulty_level || '');
            return 0;
        });
        
        return filtered;
    };

    const getFilteredAndSortedCompetencies = () => {
        let filtered = [...competencies];
        
        if (searchTerm) {
            filtered = filtered.filter(comp => 
                comp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                comp.definition?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (competenciesFilterCategory !== 'all') {
            filtered = filtered.filter(comp => comp.category === competenciesFilterCategory);
        }
        
        filtered.sort((a, b) => {
            if (competenciesSortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (competenciesSortBy === 'category') return (a.category || '').localeCompare(b.category || '');
            return 0;
        });
        
        return filtered;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Toaster position="top-right" />

            {/* Main Content */}
            <div className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Page Header with Breadcrumbs */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Breadcrumbs items={[
                            { label: 'Experience Management', href: createPageUrl("ExperienceManagement") + "#builders" },
                            { label: 'Career Path Creator' }
                        ]} />
                        <Link to={createPageUrl("ExperienceManagement") + "#builders"}>
                            <Button variant="ghost" className="mb-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Builders
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Career Path Creator
                        </h1>
                        <p className="text-gray-600">
                            Define roles, competencies, and progression paths for your organization
                        </p>
                    </motion.div>

                    {/* Tab Navigation */}
                    <div className="flex gap-4 mb-8 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`pb-4 px-4 font-medium transition-colors ${
                                activeTab === 'roles' 
                                    ? 'text-blue-600 border-b-2 border-blue-600' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                Roles ({roles.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('paths')}
                            className={`pb-4 px-4 font-medium transition-colors ${
                                activeTab === 'paths' 
                                    ? 'text-blue-600 border-b-2 border-blue-600' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                Career Paths ({careerPaths.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('competencies')}
                            className={`pb-4 px-4 font-medium transition-colors ${
                                activeTab === 'competencies' 
                                    ? 'text-blue-600 border-b-2 border-blue-600' 
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Competencies ({competencies.length})
                            </div>
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'roles' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center flex-wrap gap-3">
                                <h2 className="text-2xl font-bold text-gray-900">Organizational Roles</h2>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" onClick={downloadCSVTemplate}>
                                        <Download className="w-4 h-4 mr-2" />
                                        CSV Template
                                    </Button>
                                    <Button variant="outline" onClick={() => uploadInputRef.current?.click()}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Bulk Upload
                                    </Button>
                                    <Button variant="outline" onClick={() => deleteInputRef.current?.click()}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Bulk Delete
                                    </Button>
                                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openRoleModal()}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add New Role
                                    </Button>
                                    <input
                                        ref={uploadInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCSVUpload}
                                        className="hidden"
                                    />
                                    <input
                                        ref={deleteInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCSVDelete}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            
                            {/* Filters and Controls */}
                            <Card className="shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search roles..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                        <Select value={rolesFilterDept} onValueChange={setRolesFilterDept}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Departments</SelectItem>
                                                <SelectItem value="operations">Operations</SelectItem>
                                                <SelectItem value="sales">Sales</SelectItem>
                                                <SelectItem value="product">Product</SelectItem>
                                                <SelectItem value="technology">Technology</SelectItem>
                                                <SelectItem value="finance">Finance</SelectItem>
                                                <SelectItem value="hr">HR</SelectItem>
                                                <SelectItem value="marketing">Marketing</SelectItem>
                                                <SelectItem value="corporate">Corporate</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={rolesFilterLevel} onValueChange={setRolesFilterLevel}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Levels</SelectItem>
                                                <SelectItem value="leading_self">Leading Self</SelectItem>
                                                <SelectItem value="leading_others">Leading Others</SelectItem>
                                                <SelectItem value="leading_managers">Leading Managers</SelectItem>
                                                <SelectItem value="leading_functions">Leading Functions</SelectItem>
                                                <SelectItem value="leading_organizations">Leading Organizations</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={rolesSortBy} onValueChange={setRolesSortBy}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="title">Title</SelectItem>
                                                <SelectItem value="level">Level</SelectItem>
                                                <SelectItem value="department">Department</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex gap-1 border rounded-md">
                                            <Button
                                                variant={rolesView === 'cards' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setRolesView('cards')}
                                            >
                                                <Grid3x3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant={rolesView === 'list' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setRolesView('list')}
                                            >
                                                <List className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {getFilteredAndSortedRoles().length === 0 ? (
                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-12 text-center">
                                        <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold mb-2">No Roles Defined Yet</h3>
                                        <p className="text-gray-600 mb-4">Start by creating your first organizational role.</p>
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openRoleModal()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Role
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                rolesView === 'cards' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {getFilteredAndSortedRoles().map((role, index) => (
                                        <motion.div
                                            key={role.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => openRoleModal(role)}>
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <CardTitle className="text-lg mb-2">{role.title}</CardTitle>
                                                            <div className="flex gap-2">
                                                                <Badge variant="outline">{role.department}</Badge>
                                                                <Badge className="bg-blue-100 text-blue-800">
                                                                    {role.level?.replace('_', ' ')}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openRoleModal(role); }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                                                        {role.description}
                                                    </p>
                                                    <div className="space-y-2 text-sm">
                                                        <div>
                                                            <span className="font-medium">Required Competencies:</span>
                                                            <span className="text-gray-600 ml-2">
                                                                {role.required_competencies?.length || 0}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Experience:</span>
                                                            <span className="text-gray-600 ml-2">
                                                                {role.typical_experience_years}+ years
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                    </div>
                                    ) : (
                                    <Card className="shadow-lg border-0">
                                    <CardContent className="p-0">
                                       <div className="divide-y">
                                           {getFilteredAndSortedRoles().map((role, index) => (
                                               <motion.div
                                                   key={role.id}
                                                   initial={{ opacity: 0 }}
                                                   animate={{ opacity: 1 }}
                                                   transition={{ delay: index * 0.02 }}
                                                   className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                                   onClick={() => openRoleModal(role)}
                                               >
                                                   <div className="flex-1">
                                                       <div className="flex items-center gap-3 mb-2">
                                                           <h3 className="font-semibold text-lg">{role.title}</h3>
                                                           <Badge variant="outline">{role.department}</Badge>
                                                           <Badge className="bg-blue-100 text-blue-800">
                                                               {role.level?.replace('_', ' ')}
                                                           </Badge>
                                                       </div>
                                                       <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
                                                   </div>
                                                   <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openRoleModal(role); }}>
                                                       <Pencil className="w-4 h-4" />
                                                   </Button>
                                               </motion.div>
                                           ))}
                                       </div>
                                    </CardContent>
                                    </Card>
                                    )
                                    )}
                                    </div>
                                    )}

                                    {activeTab === 'paths' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900">Career Progression Paths</h2>
                                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openPathModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add New Path
                                </Button>
                            </div>
                            
                            <Card className="shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search career paths..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                        <Select value={pathsSortBy} onValueChange={setPathsSortBy}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="title">Title</SelectItem>
                                                <SelectItem value="duration">Duration</SelectItem>
                                                <SelectItem value="difficulty">Difficulty</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex gap-1 border rounded-md">
                                            <Button
                                                variant={pathsView === 'cards' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setPathsView('cards')}
                                            >
                                                <Grid3x3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant={pathsView === 'list' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setPathsView('list')}
                                            >
                                                <List className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {getFilteredAndSortedPaths().length === 0 ? (
                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-12 text-center">
                                        <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold mb-2">No Career Paths Defined Yet</h3>
                                        <p className="text-gray-600 mb-4">Create career progression paths between roles.</p>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openPathModal()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Path
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : pathsView === 'list' ? (
                                <div className="space-y-4">
                                    {getFilteredAndSortedPaths().map((path, index) => (
                                        <motion.div
                                            key={path.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => openPathModal(path)}>
                                                <CardContent className="p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3 className="font-semibold text-lg">{path.from_role_id}</h3>
                                                                <span className="text-gray-400">→</span>
                                                                <h3 className="font-semibold text-lg">{path.to_role_id}</h3>
                                                                <Badge className={
                                                                    path.path_type === 'vertical' 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }>
                                                                    {path.path_type}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-3">
                                                                {path.brief_description}
                                                            </p>
                                                            <div className="flex gap-4 text-sm text-gray-600">
                                                                <span>Duration: {path.typical_duration_months} months</span>
                                                                <span>•</span>
                                                                <span>Difficulty: {path.difficulty_level}</span>
                                                                <span>•</span>
                                                                <span>Competencies: {path.core_competencies?.length || 0}</span>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openPathModal(path); }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {getFilteredAndSortedPaths().map((path, index) => (
                                        <motion.div
                                            key={path.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => openPathModal(path)}>
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CardTitle className="text-lg">{path.title}</CardTitle>
                                                                <Badge className={
                                                                    path.path_type === 'vertical' 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }>
                                                                    {path.path_type}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-gray-600">{path.brief_description}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openPathModal(path); }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex gap-4 text-sm text-gray-600">
                                                        <span>Duration: {path.typical_duration_months} months</span>
                                                        <span>•</span>
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

                    {activeTab === 'competencies' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center flex-wrap gap-3">
                                <h2 className="text-2xl font-bold text-gray-900">Leadership Competencies</h2>
                                <div className="flex gap-2 flex-wrap">
                                    <Button variant="outline" onClick={downloadCompetencyCSVTemplate}>
                                        <Download className="w-4 h-4 mr-2" />
                                        CSV Template
                                    </Button>
                                    <Button variant="outline" onClick={() => compUploadInputRef.current?.click()}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Bulk Upload
                                    </Button>
                                    <Button variant="outline" onClick={() => compDeleteInputRef.current?.click()}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Bulk Delete
                                    </Button>
                                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => openCompetencyModal()}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add New Competency
                                    </Button>
                                    <input
                                        ref={compUploadInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCompetencyCSVUpload}
                                        className="hidden"
                                    />
                                    <input
                                        ref={compDeleteInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCompetencyCSVDelete}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            
                            <Card className="shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search competencies..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                        <Select value={competenciesFilterCategory} onValueChange={setCompetenciesFilterCategory}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                <SelectItem value="Situational Intelligence">Situational Intelligence</SelectItem>
                                                <SelectItem value="Tactical">Tactical</SelectItem>
                                                <SelectItem value="Self Leadership">Self Leadership</SelectItem>
                                                <SelectItem value="People Leadership">People Leadership</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={competenciesSortBy} onValueChange={setCompetenciesSortBy}>
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Sort by" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="name">Name</SelectItem>
                                                <SelectItem value="category">Category</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="flex gap-1 border rounded-md">
                                            <Button
                                                variant={competenciesView === 'cards' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setCompetenciesView('cards')}
                                            >
                                                <Grid3x3 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant={competenciesView === 'list' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setCompetenciesView('list')}
                                            >
                                                <List className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {getFilteredAndSortedCompetencies().length === 0 ? (
                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-12 text-center">
                                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-xl font-semibold mb-2">No Competencies Defined Yet</h3>
                                        <p className="text-gray-600 mb-4">Define the competencies required for different roles.</p>
                                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => openCompetencyModal()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Competency
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : competenciesView === 'cards' ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {getFilteredAndSortedCompetencies().map((comp, index) => (
                                        <motion.div
                                            key={comp.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card className="shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => openCompetencyModal(comp)}>
                                                <CardHeader>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <CardTitle className="text-lg">{comp.name}</CardTitle>
                                                            <Badge variant="outline">{comp.category}</Badge>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openCompetencyModal(comp); }}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-gray-600">{comp.definition}</p>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <Card className="shadow-lg border-0">
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {getFilteredAndSortedCompetencies().map((comp, index) => (
                                                <motion.div
                                                    key={comp.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                                    onClick={() => openCompetencyModal(comp)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-semibold text-lg">{comp.name}</h3>
                                                            <Badge variant="outline">{comp.category}</Badge>
                                                        </div>
                                                        <p className="text-sm text-gray-600 line-clamp-2">{comp.definition}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openCompetencyModal(comp); }}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}


                </div>
            </div>

            {/* Modals */}
            <RoleModal
                role={selectedRole}
                isOpen={showRoleModal}
                onClose={() => {
                    setShowRoleModal(false);
                    setSelectedRole(null);
                }}
                onSave={loadData}
            />

            <CareerPathModal
                path={selectedPath}
                roles={roles}
                isOpen={showPathModal}
                onClose={() => {
                    setShowPathModal(false);
                    setSelectedPath(null);
                }}
                onSave={loadData}
            />

            <CompetencyModal
                competency={selectedCompetency}
                isOpen={showCompetencyModal}
                onClose={() => {
                    setShowCompetencyModal(false);
                    setSelectedCompetency(null);
                }}
                onSave={loadData}
            />
        </div>
    );
}

export default withAuthProtection(CareerPathCreator, ['Admin Level 2', 'Super Administrator', 'Platform Admin']);